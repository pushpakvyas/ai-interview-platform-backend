import asyncHandler from "express-async-handler";
import Interview from "../models/Interview.js";
import InterviewQuestion from "../models/InterviewQuestion.js";
import Transcript from "../models/Transcript.js";
import Score from "../models/Score.js";
import TechnologyTemplate from "../models/TechnologyTemplate.js";
import User from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { getNextInterviewerMessage, evaluateInterviewTranscript } from "../services/aiService.js";
import { createNotification } from "../services/notificationService.js";
import { emailTemplates } from "../services/emailService.js";
import { logAudit } from "../utils/auditLogger.js";
import fs from "fs";
import path from "path";
import Recording from "../models/Recording.js";
import { TRANSCRIPTS_DIR } from "../config/multer.js";
import { toPublicUrl } from "./recordingController.js";

const MAX_WARNINGS = 3;

function combineDateTime(date, time) {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ==================== ADMIN: SCHEDULING ====================

// @route POST /api/interviews  (admin schedules)
export const scheduleInterview = asyncHandler(async (req, res) => {
  const { candidateId, technology, scheduledDate, scheduledTime, duration, difficulty } = req.body;

  const candidate = await User.findOne({ _id: candidateId, roleType: "CANDIDATE" });
  if (!candidate) throw new ApiError(404, "Candidate not found");

  const template = await TechnologyTemplate.findOne({ technology, isActive: true });
  if (!template) throw new ApiError(404, `No active template found for technology: ${technology}`);

  const newDuration = duration || 30;
  const newStart = combineDateTime(scheduledDate, scheduledTime);
  const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000);

  const existingInterviews = await Interview.find({
    candidate: candidateId,
    status: { $in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
  });

  const conflict = existingInterviews.find((iv) => {
    const ivStart = combineDateTime(iv.scheduledDate, iv.scheduledTime);
    const ivEnd = new Date(ivStart.getTime() + (iv.duration || 30) * 60 * 1000);
    return newStart < ivEnd && ivStart < newEnd;
  });

  if (conflict) {
    throw new ApiError(
      409,
      `This candidate already has a ${conflict.technology} interview scheduled at ${conflict.scheduledTime} on ${new Date(conflict.scheduledDate).toDateString()} — cannot schedule an overlapping interview.`
    );
  }

  const interview = await Interview.create({
    candidate: candidateId,
    scheduledBy: req.user._id,
    technology,
    technologyTemplate: template._id,
    systemPromptUsed: template.defaultSystemPrompt,
    promptVersion: template.promptVersions.at(-1)?.version || 1,
    scheduledDate,
    scheduledTime,
    duration: newDuration,
    difficulty: difficulty || "Medium",
    status: "SCHEDULED",
  });

  const { subject, html } = emailTemplates.interviewScheduled(
    candidate.firstName,
    technology,
    new Date(scheduledDate).toDateString(),
    scheduledTime
  );
  await createNotification({
    user: candidate._id,
    type: "INTERVIEW_SCHEDULED",
    title: "Interview Scheduled",
    message: `Your ${technology} interview is scheduled on ${new Date(scheduledDate).toDateString()} at ${scheduledTime}.`,
    relatedInterview: interview._id,
    sendAsEmail: true,
    emailHtml: { to: candidate.email, subject, html },
  });

  await logAudit({ actor: req.user._id, action: "INTERVIEW_SCHEDULED", entityType: "Interview", entityId: interview._id, ipAddress: req.ip });

  res.status(201).json({ success: true, interview });
});

// @route PUT /api/interviews/:id/reschedule  (admin)
export const rescheduleInterview = asyncHandler(async (req, res) => {
  const { scheduledDate, scheduledTime, reason } = req.body;

  const interview = await Interview.findById(req.params.id).populate("candidate");
  if (!interview) throw new ApiError(404, "Interview not found");
  if (["COMPLETED", "CANCELLED"].includes(interview.status)) {
    throw new ApiError(400, `Cannot reschedule an interview that is ${interview.status}`);
  }

  interview.rescheduleHistory.push({
    previousDate: interview.scheduledDate,
    previousTime: interview.scheduledTime,
    reason,
    changedBy: req.user._id,
  });
  interview.scheduledDate = scheduledDate;
  interview.scheduledTime = scheduledTime;
  interview.status = "RESCHEDULED";
  await interview.save();

  const { subject, html } = emailTemplates.interviewRescheduled(
    interview.candidate.firstName,
    interview.technology,
    new Date(scheduledDate).toDateString(),
    scheduledTime
  );
  await createNotification({
    user: interview.candidate._id,
    type: "INTERVIEW_RESCHEDULED",
    title: "Interview Rescheduled",
    message: `Your ${interview.technology} interview has been rescheduled.`,
    relatedInterview: interview._id,
    sendAsEmail: true,
    emailHtml: { to: interview.candidate.email, subject, html },
  });

  res.json({ success: true, interview });
});

// @route PUT /api/interviews/:id/cancel  (admin)
export const cancelInterview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const interview = await Interview.findById(req.params.id).populate("candidate");
  if (!interview) throw new ApiError(404, "Interview not found");

  interview.status = "CANCELLED";
  interview.cancellationReason = reason;
  await interview.save();

  const { subject, html } = emailTemplates.interviewCancelled(interview.candidate.firstName, interview.technology);
  await createNotification({
    user: interview.candidate._id,
    type: "INTERVIEW_CANCELLED",
    title: "Interview Cancelled",
    message: `Your ${interview.technology} interview has been cancelled.`,
    relatedInterview: interview._id,
    sendAsEmail: true,
    emailHtml: { to: interview.candidate.email, subject, html },
  });

  res.json({ success: true, interview });
});

// ==================== CANDIDATE: LIVE INTERVIEW FLOW ====================

// @route POST /api/interviews/:id/start
export const startInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id }).populate(
    "technologyTemplate candidate"
  );
  if (!interview) throw new ApiError(404, "Interview not found");
  if (!["SCHEDULED", "RESCHEDULED"].includes(interview.status)) {
    throw new ApiError(400, `Interview cannot be started (status: ${interview.status})`);
  }

  const EARLY_START_GRACE_MS = 10 * 60 * 1000;
  const scheduledDateTime = combineDateTime(interview.scheduledDate, interview.scheduledTime);
  if (Date.now() < scheduledDateTime.getTime() - EARLY_START_GRACE_MS) {
    throw new ApiError(
      400,
      `This interview is scheduled for ${scheduledDateTime.toLocaleString()}. You can start up to 10 minutes before that time.`
    );
  }

  interview.status = "IN_PROGRESS";
  interview.startedAt = new Date();
  await interview.save();

  const greeting = await getNextInterviewerMessage({
    systemPrompt: interview.systemPromptUsed,
    history: [],
    isStart: true,
    minutesLeft: interview.duration,
    difficulty: interview.difficulty,
    candidateName: interview.candidate.firstName,
    candidateExperience: interview.candidate.experience,
  });

  const question = await InterviewQuestion.create({
    interview: interview._id,
    order: 1,
    question: greeting,
    difficulty: interview.difficulty.toUpperCase(),
  });

  res.json({ success: true, interview, greeting, questionId: question._id });
});

// @route POST /api/interviews/:id/message  (candidate answers, AI responds)
export const sendMessage = asyncHandler(async (req, res) => {
  const { message, history = [], timeLeftSeconds, questionId, isRetry } = req.body;

  const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id }).populate(
    "technologyTemplate candidate"
  );
  if (!interview) throw new ApiError(404, "Interview not found");
  if (interview.status !== "IN_PROGRESS") throw new ApiError(400, "Interview is not in progress");

  // Save transcript entry (with retry handling — max 1 retry per question)
  if (questionId) {
    let entry = await Transcript.findOne({ interview: interview._id, question: questionId });
    const question = await InterviewQuestion.findById(questionId);

    if (!entry) {
      entry = await Transcript.create({
        interview: interview._id,
        question: questionId,
        questionText: question?.question || "",
        answers: [{ text: message, isRetry: false }],
        finalAnswerText: message,
      });
    } else if (isRetry) {
      if (entry.retryCount >= 1) throw new ApiError(400, "Retry limit reached for this question");
      entry.answers.forEach((a) => (a.archived = true));
      entry.answers.push({ text: message, isRetry: true });
      entry.retryCount += 1;
      entry.finalAnswerText = message;
      await entry.save();
    } else {
      entry.finalAnswerText = message;
      await entry.save();
    }
  }

  const minutesLeft = Math.max(1, Math.round((timeLeftSeconds ?? interview.duration * 60) / 60));

  const aiText = await getNextInterviewerMessage({
    systemPrompt: interview.systemPromptUsed,
    history,
    candidateMessage: message,
    minutesLeft,
    difficulty: interview.difficulty,
    candidateName: interview.candidate.firstName,
    candidateExperience: interview.candidate.experience,
  });

  const nextOrder = (await InterviewQuestion.countDocuments({ interview: interview._id })) + 1;
  const nextQuestion = await InterviewQuestion.create({
    interview: interview._id,
    order: nextOrder,
    question: aiText,
    isFollowUp: true,
    difficulty: interview.difficulty.toUpperCase(),
  });

  res.json({ success: true, response: aiText, questionId: nextQuestion._id });
});

// @route POST /api/interviews/:id/violation  (anti-cheat)
export const recordViolation = asyncHandler(async (req, res) => {
  const { type, details } = req.body;

  const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id });
  if (!interview) throw new ApiError(404, "Interview not found");
  if (interview.status !== "IN_PROGRESS") throw new ApiError(400, "Interview is not in progress");

  interview.violations.push({ type, details });
  interview.warningsCount += 1;

  let terminated = false;
  if (interview.warningsCount >= MAX_WARNINGS) {
    interview.status = "COMPLETED";
    interview.endedAt = new Date();
    interview.terminatedForViolation = true;
    terminated = true;

    const score = await Score.create({
      interview: interview._id,
      candidate: interview.candidate,
      technicalKnowledge: 0,
      communication: 0,
      domainKnowledge: 0,
      confidence: 0,
      clarity: 0,
      overallScore: 0,
      strengths: [],
      weaknesses: [],
      improvementSuggestions: [],
      hiringRecommendation: "Reject",
      aiFeedback: "This interview was terminated early due to repeated anti-cheat violations. No evaluation was performed.",
    });
    interview.score = score._id;
  }

  await interview.save();
  res.json({
    success: true,
    warningsCount: interview.warningsCount,
    maxWarnings: MAX_WARNINGS,
    terminated,
  });
});

// @route POST /api/interviews/:id/end
export const endInterview = asyncHandler(async (req, res) => {
  const { textTranscript } = req.body;

  const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id }).populate(
    "candidate technologyTemplate"
  );
  if (!interview) throw new ApiError(404, "Interview not found");

  if (interview.status === "COMPLETED") {
    const score = await Score.findOne({ interview: interview._id });
    return res.json({ success: true, interview, score });
  }

  interview.status = "COMPLETED";
  interview.endedAt = new Date();
  await interview.save();

  if (textTranscript) {
  try {
    const interviewDir = path.join(TRANSCRIPTS_DIR, String(interview._id));
    fs.mkdirSync(interviewDir, { recursive: true });
    const filePath = path.join(interviewDir, `transcript-${Date.now()}.txt`);
    fs.writeFileSync(filePath, textTranscript, "utf-8");

    let recording = await Recording.findOne({ interview: interview._id });
    if (!recording) {
      recording = await Recording.create({ interview: interview._id, uploadStatus: "PENDING" });
    }
    recording.transcriptPath = filePath;
    recording.transcriptUrl = toPublicUrl(filePath);
    await recording.save();

    interview.recording = recording._id;
    await interview.save();
  } catch (err) {
    console.error(`⚠️ Failed to write transcript file for interview ${interview._id}:`, err.message);
  }
}

  const evaluationCriteria = interview.technologyTemplate?.evaluationCriteria || [
    "Technical Knowledge",
    "Communication",
    "Domain Knowledge",
    "Confidence",
    "Clarity",
  ];

  const evaluation = await evaluateInterviewTranscript({
    textTranscript,
    technology: interview.technology,
    evaluationCriteria,
  });

  const score = await Score.create({
    interview: interview._id,
    candidate: interview.candidate._id,
    technicalKnowledge: evaluation.technicalKnowledge,
    communication: evaluation.communication,
    domainKnowledge: evaluation.domainKnowledge,
    confidence: evaluation.confidence,
    clarity: evaluation.clarity,
    overallScore: evaluation.overallScore,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    improvementSuggestions: evaluation.improvementSuggestions,
    hiringRecommendation: evaluation.hiringRecommendation,
    aiFeedback: evaluation.aiFeedback,
  });

  interview.score = score._id;
  await interview.save();

  const { subject, html } = emailTemplates.resultGenerated(
    interview.candidate.firstName,
    interview.technology,
    evaluation.overallScore
  );
  await createNotification({
    user: interview.candidate._id,
    type: "RESULT_GENERATED",
    title: "Interview Result Ready",
    message: `Your result for the ${interview.technology} interview is ready.`,
    relatedInterview: interview._id,
    sendAsEmail: true,
    emailHtml: { to: interview.candidate.email, subject, html },
  });

  res.json({ success: true, interview, score });
});

// @route GET /api/interviews/:id/transcript
export const getTranscript = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, "Interview not found");

  const isOwner = String(interview.candidate) === String(req.user._id);
  if (!isOwner && req.user.roleType !== "ADMIN") throw new ApiError(403, "Not authorized");

  const transcript = await Transcript.find({ interview: interview._id }).sort({ timestamp: 1 });
  res.json({ success: true, transcript });
});

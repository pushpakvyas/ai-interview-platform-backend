import asyncHandler from "express-async-handler";
import PDFDocument from "pdfkit";
import Interview from "../models/Interview.js";
import Transcript from "../models/Transcript.js";
import Score from "../models/Score.js";
import { ApiError } from "../utils/apiError.js";

// @route GET /api/reports/:interviewId
export const getInterviewReport = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.interviewId)
    .populate("candidate", "firstName lastName email technology experience")
    .populate("score")
    .populate("recording");

  if (!interview) throw new ApiError(404, "Interview not found");

  const isOwner = String(interview.candidate._id) === String(req.user._id);
  if (!isOwner && req.user.roleType !== "ADMIN") throw new ApiError(403, "Not authorized");

  const transcript = await Transcript.find({ interview: interview._id }).sort({ timestamp: 1 });

  res.json({ success: true, interview, transcript });
});

// @route GET /api/reports/:interviewId/pdf
export const downloadReportPdf = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.interviewId)
    .populate("candidate", "firstName lastName email")
    .populate("score");

  if (!interview) throw new ApiError(404, "Interview not found");

  const isOwner = String(interview.candidate._id) === String(req.user._id);
  if (!isOwner && req.user.roleType !== "ADMIN") throw new ApiError(403, "Not authorized");

  const transcript = await Transcript.find({ interview: interview._id }).sort({ timestamp: 1 });
  const score = interview.score;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=interview-report-${interview._id}.pdf`
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text("Interview Report", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Candidate: ${interview.candidate.firstName} ${interview.candidate.lastName}`);
  doc.text(`Email: ${interview.candidate.email}`);
  doc.text(`Technology: ${interview.technology}`);
  doc.text(`Date: ${new Date(interview.scheduledDate).toDateString()}`);
  doc.text(`Status: ${interview.status}`);
  doc.moveDown();

  if (score) {
    doc.fontSize(14).text("Scores", { underline: true });
    doc.fontSize(12).text(`Overall Score: ${score.overriddenByAdmin ? score.overriddenScore : score.overallScore}/100`);
    doc.text(`Technical Knowledge: ${score.technicalKnowledge}/100`);
    doc.text(`Communication: ${score.communication}/100`);
    doc.text(`Domain Knowledge: ${score.domainKnowledge}/100`);
    doc.text(`Confidence: ${score.confidence}/100`);
    doc.text(`Clarity: ${score.clarity}/100`);
    doc.text(`Hiring Recommendation: ${score.hiringRecommendation}`);
    doc.moveDown();

    doc.fontSize(14).text("Feedback", { underline: true });
    doc.fontSize(12).text(score.aiFeedback || "N/A");
    doc.moveDown();

    if (score.strengths?.length) {
      doc.fontSize(13).text("Strengths:", { underline: true });
      score.strengths.forEach((s) => doc.fontSize(11).text(`• ${s}`));
      doc.moveDown(0.5);
    }
    if (score.weaknesses?.length) {
      doc.fontSize(13).text("Weaknesses:", { underline: true });
      score.weaknesses.forEach((w) => doc.fontSize(11).text(`• ${w}`));
      doc.moveDown(0.5);
    }
  }

  doc.moveDown();
  doc.fontSize(14).text("Transcript", { underline: true });
  transcript.forEach((entry) => {
    doc.fontSize(11).text(`Q: ${entry.questionText}`);
    doc.fontSize(11).text(`A: ${entry.finalAnswerText || ""}`);
    doc.moveDown(0.5);
  });

  doc.end();
});

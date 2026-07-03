import Interview from "../models/Interview.js";
import { createNotification } from "./notificationService.js";

const GRACE_MS = 15 * 60 * 1000; // grace period after the scheduled/started window ends

function windowEnd(interview) {
  const [hours, minutes] = interview.scheduledTime.split(":").map(Number);
  const start = new Date(interview.scheduledDate);
  start.setHours(hours, minutes, 0, 0);
  return new Date(start.getTime() + (interview.duration || 30) * 60 * 1000);
}

async function markExpired(interview, extraFields = {}) {
  interview.status = "EXPIRED";
  Object.assign(interview, extraFields);
  await interview.save();

  await createNotification({
    user: interview.candidate,
    type: "INTERVIEW_EXPIRED",
    title: "Interview Missed",
    message: `Your ${interview.technology} interview scheduled on ${new Date(interview.scheduledDate).toDateString()} at ${interview.scheduledTime} was marked as missed.`,
    relatedInterview: interview._id,
  });
}

// Sweeps overdue interviews that were never started (SCHEDULED/RESCHEDULED)
// or were started but never finished (IN_PROGRESS), flipping them to the
// existing EXPIRED status ("Missed" in the UI) once their time window plus a
// grace period has elapsed. Run periodically from server.js.
export async function expireOverdueInterviews() {
  const now = Date.now();

  const overdueScheduled = await Interview.find({ status: { $in: ["SCHEDULED", "RESCHEDULED"] } });
  for (const interview of overdueScheduled) {
    if (now > windowEnd(interview).getTime() + GRACE_MS) {
      await markExpired(interview);
    }
  }

  const staleInProgress = await Interview.find({ status: "IN_PROGRESS" });
  for (const interview of staleInProgress) {
    const startedAt = interview.startedAt || interview.createdAt;
    const deadline = startedAt.getTime() + (interview.duration || 30) * 60 * 1000 + GRACE_MS;
    if (now > deadline) {
      await markExpired(interview, { endedAt: new Date() });
    }
  }
}

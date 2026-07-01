import express from "express";
import {
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  startInterview,
  sendMessage,
  recordViolation,
  endInterview,
  getTranscript,
} from "../controllers/interviewController.js";
import { uploadRecording, getRecording, deleteRecording } from "../controllers/recordingController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { uploadRecordingFiles } from "../config/multer.js";

const router = express.Router();

router.use(protect);

// Admin: scheduling
router.post(
  "/",
  restrictTo("ADMIN"),
  validate(["candidateId", "technology", "scheduledDate", "scheduledTime"]),
  scheduleInterview
);
router.put("/:id/reschedule", restrictTo("ADMIN"), rescheduleInterview);
router.put("/:id/cancel", restrictTo("ADMIN"), cancelInterview);

// Candidate: live interview flow
router.post("/:id/start", restrictTo("CANDIDATE"), startInterview);
router.post("/:id/message", restrictTo("CANDIDATE"), validate(["message"]), sendMessage);
router.post("/:id/violation", restrictTo("CANDIDATE"), validate(["type"]), recordViolation);
router.post("/:id/end", restrictTo("CANDIDATE"), endInterview);

// Shared
router.get("/:id/transcript", getTranscript);
router.post("/:id/recording", restrictTo("CANDIDATE"), uploadRecordingFiles, uploadRecording);
router.get("/:id/recording", getRecording);
router.delete("/:id/recording", restrictTo("ADMIN"), deleteRecording);

export default router;

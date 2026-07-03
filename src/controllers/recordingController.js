import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import Interview from "../models/Interview.js";
import Recording from "../models/Recording.js";
import { ApiError } from "../utils/apiError.js";
import { UPLOAD_ROOT } from "../config/multer.js";

// Build the public URL path for a file saved under UPLOAD_ROOT, served via express.static at /uploads
export function toPublicUrl(absolutePath) {
  const relative = path.relative(UPLOAD_ROOT, absolutePath).split(path.sep).join("/");
  return `/uploads/${relative}`;
}

// @route POST /api/interviews/:id/recording  (multipart: video, audio)
// Files are saved to disk directly by multer (see config/multer.js); this handler
// just records the resulting file paths/URLs against the interview's Recording doc.
export const uploadRecording = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, candidate: req.user._id });
  if (!interview) throw new ApiError(404, "Interview not found");

  const videoFile = req.files?.video?.[0];
  const audioFile = req.files?.audio?.[0];
  if (!videoFile && !audioFile) throw new ApiError(400, "No video or audio file provided");

  let recording = await Recording.findOne({ interview: interview._id });
  if (!recording) {
    recording = await Recording.create({ interview: interview._id, uploadStatus: "UPLOADING" });
  } else {
    recording.uploadStatus = "UPLOADING";
  }

  try {
    if (videoFile) {
      recording.videoPath = videoFile.path;
      recording.videoUrl = toPublicUrl(videoFile.path);
      recording.fileSizeBytes = (recording.fileSizeBytes || 0) + videoFile.size;
    }
    if (audioFile) {
      recording.audioPath = audioFile.path;
      recording.audioUrl = toPublicUrl(audioFile.path);
      recording.fileSizeBytes = (recording.fileSizeBytes || 0) + audioFile.size;
    }
    recording.uploadStatus = "COMPLETED";
    await recording.save();

    interview.recording = recording._id;
    await interview.save();

    res.json({ success: true, recording });
  } catch (err) {
    recording.uploadStatus = "FAILED";
    await recording.save();
    throw new ApiError(500, `Recording save failed: ${err.message}`);
  }
});

// @route GET /api/interviews/:id/recording
export const getRecording = asyncHandler(async (req, res) => {
  const recording = await Recording.findOne({ interview: req.params.id });
  if (!recording) throw new ApiError(404, "Recording not found");
  res.json({ success: true, recording });
});

// @route DELETE /api/interviews/:id/recording  (admin cleanup — removes files from disk too)
export const deleteRecording = asyncHandler(async (req, res) => {
  const recording = await Recording.findOne({ interview: req.params.id });
  if (!recording) throw new ApiError(404, "Recording not found");

  [recording.videoPath, recording.audioPath].forEach((p) => {
    if (p && fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch (err) {
        console.error(`⚠️ Failed to delete file ${p}:`, err.message);
      }
    }
  });

  await recording.deleteOne();
  await Interview.findByIdAndUpdate(req.params.id, { $unset: { recording: 1 } });

  res.json({ success: true, message: "Recording deleted" });
});

import multer from "multer";
import fs from "fs";
import path from "path";

// Base directory for all local uploads, configurable via .env (defaults to ./uploads)
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve("uploads");

const RECORDINGS_DIR = path.join(UPLOAD_ROOT, "recordings");
const RESUMES_DIR = path.join(UPLOAD_ROOT, "resumes");

// Ensure upload directories exist at startup
[UPLOAD_ROOT, RECORDINGS_DIR, RESUMES_DIR].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

function sanitizeFilename(originalName) {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Group recordings under uploads/recordings/<interviewId>/
    const interviewDir = path.join(RECORDINGS_DIR, req.params.id || "misc");
    fs.mkdirSync(interviewDir, { recursive: true });
    cb(null, interviewDir);
  },
  filename: (req, file, cb) => {
    const ext = file.fieldname === "video" ? "webm" : "webm";
    cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
  },
});

export const uploadRecordingFiles = multer({
  storage: recordingStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB, local disk so more headroom than Cloudinary free tier
}).fields([
  { name: "video", maxCount: 1 },
  { name: "audio", maxCount: 1 },
]);

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RESUMES_DIR),
  filename: (req, file, cb) => {
    const safeName = sanitizeFilename(file.originalname);
    cb(null, `${req.user?._id || "anon"}-${Date.now()}-${safeName}`);
  },
});

export const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("resume");

export { RECORDINGS_DIR, RESUMES_DIR };

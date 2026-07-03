import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true, unique: true },

    // Public, web-accessible URL (served via express.static from UPLOAD_ROOT), e.g. /uploads/recordings/<id>/video-123.webm
    videoUrl: { type: String },
    audioUrl: { type: String },

    // Absolute path on disk, used internally for deletion/cleanup — never exposed to the client
    videoPath: { type: String },
    audioPath: { type: String },

    fileSizeBytes: { type: Number },
    durationSeconds: { type: Number },

    // Plain-text transcript of the full interview, written to disk when the
    // interview ends (see endInterview in interviewController.js).
    transcriptUrl: { type: String },
    transcriptPath: { type: String },

    uploadStatus: {
      type: String,
      enum: ["PENDING", "UPLOADING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Recording", recordingSchema);

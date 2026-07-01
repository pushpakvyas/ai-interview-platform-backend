import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    technology: { type: String, required: true },
    technologyTemplate: { type: mongoose.Schema.Types.ObjectId, ref: "TechnologyTemplate" },
    systemPromptUsed: { type: String },
    promptVersion: { type: Number },

    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true }, // "HH:mm"
    duration: { type: Number, required: true, default: 30 }, // minutes
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },

    status: {
      type: String,
      enum: ["SCHEDULED", "RESCHEDULED", "CANCELLED", "IN_PROGRESS", "COMPLETED", "EXPIRED"],
      default: "SCHEDULED",
    },

    startedAt: { type: Date },
    endedAt: { type: Date },

    warningsCount: { type: Number, default: 0 },
    violations: [
      {
        type: {
          type: String,
          enum: [
            "TAB_SWITCH",
            "WINDOW_MINIMIZE",
            "MULTIPLE_FACES",
            "FACE_MISSING",
            "COPY_PASTE",
            "DEV_TOOLS",
            "LOOKING_AWAY",
            "LEFT_SEAT",
            "SCREEN_RECORDING",
          ],
        },
        timestamp: { type: Date, default: Date.now },
        details: { type: String },
      },
    ],
    terminatedForViolation: { type: Boolean, default: false },

    recording: { type: mongoose.Schema.Types.ObjectId, ref: "Recording" },
    score: { type: mongoose.Schema.Types.ObjectId, ref: "Score" },

    rescheduleHistory: [
      {
        previousDate: Date,
        previousTime: String,
        reason: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

interviewSchema.index({ candidate: 1, status: 1 });
interviewSchema.index({ scheduledDate: 1 });

export default mongoose.model("Interview", interviewSchema);

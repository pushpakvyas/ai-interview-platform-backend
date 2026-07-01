import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "INTERVIEW_SCHEDULED",
        "INTERVIEW_RESCHEDULED",
        "INTERVIEW_CANCELLED",
        "INTERVIEW_REMINDER",
        "INTERVIEW_COMPLETED",
        "RESULT_GENERATED",
        "GENERAL",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedInterview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview" },
    isRead: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);

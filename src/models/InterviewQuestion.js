import mongoose from "mongoose";

const interviewQuestionSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    order: { type: Number, required: true },
    question: { type: String, required: true },
    topic: { type: String },
    difficulty: { type: String, enum: ["EASY", "MEDIUM", "HARD"], default: "MEDIUM" },
    isFollowUp: { type: Boolean, default: false },
    askedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

interviewQuestionSchema.index({ interview: 1, order: 1 });

export default mongoose.model("InterviewQuestion", interviewQuestionSchema);

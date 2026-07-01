import mongoose from "mongoose";

const answerVersionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    isRetry: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const transcriptEntrySchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewQuestion", required: true },
    questionText: { type: String, required: true },
    answers: [answerVersionSchema], // [0] = original, [1] = retry (max 2)
    retryCount: { type: Number, default: 0, max: 1 },
    finalAnswerText: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

transcriptEntrySchema.index({ interview: 1 });

export default mongoose.model("Transcript", transcriptEntrySchema);

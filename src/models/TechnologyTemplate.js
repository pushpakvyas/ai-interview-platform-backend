import mongoose from "mongoose";

const questionBankItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    topic: { type: String },
    difficulty: { type: String, enum: ["EASY", "MEDIUM", "HARD"], default: "MEDIUM" },
  },
  { _id: false }
);

const technologyTemplateSchema = new mongoose.Schema(
  {
    technology: { type: String, required: true, unique: true, trim: true },
    defaultSystemPrompt: { type: String, required: true },
    questionBank: [questionBankItemSchema],
    evaluationCriteria: {
      type: [String],
      default: [
        "Technical Knowledge",
        "Communication",
        "Domain Knowledge",
        "Confidence",
        "Clarity",
      ],
    },
    promptVersions: [
      {
        version: { type: Number, required: true },
        systemPrompt: { type: String, required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("TechnologyTemplate", technologyTemplateSchema);

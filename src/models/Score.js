import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true, unique: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    technicalKnowledge: { type: Number, min: 0, max: 100, default: 0 },
    communication: { type: Number, min: 0, max: 100, default: 0 },
    domainKnowledge: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    clarity: { type: Number, min: 0, max: 100, default: 0 },

    overallScore: { type: Number, min: 0, max: 100, default: 0 },

    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    improvementSuggestions: [{ type: String }],

    hiringRecommendation: {
      type: String,
      enum: ["Strong Hire", "Hire", "Borderline", "Reject"],
      default: "Borderline",
    },

    aiFeedback: { type: String },

    // Admin override
    overriddenByAdmin: { type: Boolean, default: false },
    overriddenScore: { type: Number, min: 0, max: 100 },
    overrideReason: { type: String },
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    overriddenAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Score", scoreSchema);

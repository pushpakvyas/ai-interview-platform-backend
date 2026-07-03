import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // Instructions blended into a job role's combined interview prompt when
    // this skill is one of several making up the role (see
    // interviewController.buildCombinedSystemPrompt). Distinct from
    // TechnologyTemplate.defaultSystemPrompt, which drives a full standalone
    // single-technology interview (e.g. "React Developer") on its own.
    systemPromptFragment: { type: String, required: true },
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
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Skill", skillSchema);

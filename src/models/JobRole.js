import mongoose from "mongoose";

const jobRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    skills: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "A job role must include at least one skill",
      },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("JobRole", jobRoleSchema);

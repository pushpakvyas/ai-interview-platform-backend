import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true }, // e.g. "INTERVIEW_SCHEDULED", "SCORE_OVERRIDDEN"
    entityType: { type: String }, // e.g. "Interview", "User"
    entityId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);

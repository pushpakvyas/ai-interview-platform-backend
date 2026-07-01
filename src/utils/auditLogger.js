import AuditLog from "../models/AuditLog.js";

export async function logAudit({ actor, action, entityType, entityId, metadata, ipAddress }) {
  try {
    await AuditLog.create({ actor, action, entityType, entityId, metadata, ipAddress });
  } catch (err) {
    console.error("⚠️ Failed to write audit log:", err.message);
  }
}

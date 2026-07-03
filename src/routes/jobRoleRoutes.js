import express from "express";
import {
  listJobRoles,
  getJobRole,
  createJobRole,
  updateJobRole,
  deactivateJobRole,
} from "../controllers/jobRoleController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.get("/", protect, listJobRoles);
router.get("/:id", protect, getJobRole);
router.post("/", protect, restrictTo("ADMIN"), validate(["name", "skills"]), createJobRole);
router.put("/:id", protect, restrictTo("ADMIN"), updateJobRole);
router.delete("/:id", protect, restrictTo("ADMIN"), deactivateJobRole);

export default router;

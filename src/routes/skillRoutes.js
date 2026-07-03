import express from "express";
import { listSkills, getSkill, createSkill, updateSkill, deactivateSkill } from "../controllers/skillController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.get("/", protect, listSkills);
router.get("/:id", protect, getSkill);
router.post("/", protect, restrictTo("ADMIN"), validate(["name"]), createSkill);
router.put("/:id", protect, restrictTo("ADMIN"), updateSkill);
router.delete("/:id", protect, restrictTo("ADMIN"), deactivateSkill);

export default router;

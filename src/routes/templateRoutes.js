import express from "express";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deactivateTemplate,
} from "../controllers/templateController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.get("/", protect, listTemplates);
router.get("/:id", protect, getTemplate);
router.post(
  "/",
  protect,
  restrictTo("ADMIN"),
  validate(["technology", "defaultSystemPrompt"]),
  createTemplate
);
router.put("/:id", protect, restrictTo("ADMIN"), updateTemplate);
router.delete("/:id", protect, restrictTo("ADMIN"), deactivateTemplate);

export default router;

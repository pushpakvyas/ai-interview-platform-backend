import express from "express";
import {
  getDashboard,
  updateProfile,
  getInterviewDetail,
  getResults,
} from "../controllers/candidateController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, restrictTo("CANDIDATE"));

router.get("/dashboard", getDashboard);
router.put("/profile", updateProfile);
router.get("/results", getResults);
router.get("/interviews/:id", getInterviewDetail);

export default router;

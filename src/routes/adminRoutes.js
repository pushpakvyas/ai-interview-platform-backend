import express from "express";
import {
  getDashboard,
  listCandidates,
  listInterviews,
  deactivateCandidate,
  overrideScore,
} from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, restrictTo("ADMIN"));

router.get("/dashboard", getDashboard);
router.get("/candidates", listCandidates);
router.get("/interviews", listInterviews);
router.put("/candidates/:id/deactivate", deactivateCandidate);
router.put("/scores/:interviewId/override", overrideScore);

export default router;

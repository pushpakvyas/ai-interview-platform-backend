import express from "express";
import {
  getDashboard,
  listCandidates,
  createCandidate,
  listInterviews,
  deactivateCandidate,
  overrideScore,
} from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.use(protect, restrictTo("ADMIN"));

router.get("/dashboard", getDashboard);
router.get("/candidates", listCandidates);
router.post(
  "/candidates",
  validate(["firstName", "lastName", "email", "mobile", "password"]),
  createCandidate
);
router.get("/interviews", listInterviews);
router.put("/candidates/:id/deactivate", deactivateCandidate);
router.put("/scores/:interviewId/override", overrideScore);

export default router;

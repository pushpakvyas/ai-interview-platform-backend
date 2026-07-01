import express from "express";
import { getInterviewReport, downloadReportPdf } from "../controllers/reportController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, restrictTo("ADMIN", "CANDIDATE"));

router.get("/:interviewId", getInterviewReport);
router.get("/:interviewId/pdf", downloadReportPdf);

export default router;

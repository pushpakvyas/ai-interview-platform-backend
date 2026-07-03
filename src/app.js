import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";

import authRoutes from "./routes/authRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import jobRoleRoutes from "./routes/jobRoleRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { UPLOAD_ROOT } from "./config/multer.js";

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(generalLimiter);

// Serve locally-stored recordings/resumes (instead of Cloudinary).
// Files are not directly browsable (no index), only fetchable by exact path —
// the path itself (containing the recording filename) acts as the access key.
app.use("/uploads", express.static(UPLOAD_ROOT));

// Health check
app.get("/api/health", (req, res) => res.json({ success: true, status: "ok" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/job-roles", jobRoleRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

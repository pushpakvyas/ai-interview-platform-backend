import express from "express";
import {
  registerCandidate,
  login,
  refresh,
  logout,
  createAdmin,
  getMe,
} from "../controllers/authController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  validate(["firstName", "lastName", "email", "mobile", "password"]),
  registerCandidate
);
router.post("/login", authLimiter, validate(["email", "password"]), login);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.post(
  "/admin/create",
  protect,
  restrictTo("ADMIN"),
  validate(["firstName", "lastName", "email", "mobile", "password"]),
  createAdmin
);

export default router;

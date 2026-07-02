import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/generateTokens.js";
import { logAudit } from "../utils/auditLogger.js";

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// @route POST /api/auth/register
// Self-registration is disabled — candidate accounts are now created only
// by an admin (see POST /api/admin/candidates). This route is kept (rather
// than removed) so it responds with a clear, actionable error instead of a
// generic 404 if anything still links to it.
export const registerCandidate = asyncHandler(async (req, res) => {
  throw new ApiError(
    403,
    "Self-registration is disabled. Please contact your administrator to have a candidate account created for you."
  );
});

// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password +refreshTokens");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive) throw new ApiError(403, "Account is deactivated");

  user.lastLoginAt = new Date();
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokens.push(refreshToken);
  await user.save();

  setRefreshCookie(res, refreshToken);
  await logAudit({ actor: user._id, action: "LOGIN", entityType: "User", entityId: user._id, ipAddress: req.ip });

  res.json({ success: true, user: user.toSafeObject(), accessToken });
});

// @route POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, "No refresh token provided");

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.id).select("+refreshTokens");
  if (!user || !user.refreshTokens.includes(token)) {
    throw new ApiError(401, "Refresh token not recognized");
  }

  // Rotate refresh token
  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  const newRefreshToken = generateRefreshToken(user);
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  setRefreshCookie(res, newRefreshToken);
  const accessToken = generateAccessToken(user);
  res.json({ success: true, accessToken });
});

// @route POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token && req.user) {
    await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: token } });
  }
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out" });
});

// @route POST /api/auth/admin/create  (admin creates another admin)
export const createAdmin = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, mobile, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email is already registered");

  const admin = await User.create({
    firstName,
    lastName,
    email,
    mobile,
    password,
    roleType: "ADMIN",
    profileCompleted: true,
  });

  await logAudit({
    actor: req.user._id,
    action: "ADMIN_CREATED",
    entityType: "User",
    entityId: admin._id,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, user: admin.toSafeObject() });
});

// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

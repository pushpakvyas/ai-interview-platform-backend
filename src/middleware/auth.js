import asyncHandler from "express-async-handler";
import { ApiError } from "../utils/apiError.js";
import { verifyAccessToken } from "../utils/generateTokens.js";
import User from "../models/User.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) throw new ApiError(401, "Not authorized, no token provided");

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, "Not authorized, token invalid or expired");
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or deactivated");
  }

  req.user = user;
  next();
});

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.roleType)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };

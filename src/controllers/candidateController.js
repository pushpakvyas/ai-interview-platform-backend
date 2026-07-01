import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Interview from "../models/Interview.js";
import Score from "../models/Score.js";
import { ApiError } from "../utils/apiError.js";

// @route GET /api/candidate/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const now = new Date();

  const upcoming = await Interview.find({
    candidate: candidateId,
    status: { $in: ["SCHEDULED", "RESCHEDULED"] },
    scheduledDate: { $gte: new Date(now.toDateString()) },
  }).sort({ scheduledDate: 1, scheduledTime: 1 });

  const completed = await Interview.find({
    candidate: candidateId,
    status: "COMPLETED",
  })
    .sort({ endedAt: -1 })
    .populate("score");

  const todayStr = now.toDateString();
  const todaysInterview = upcoming.find(
    (iv) => new Date(iv.scheduledDate).toDateString() === todayStr
  );

  res.json({
    success: true,
    upcoming,
    completed,
    todaysInterview: todaysInterview || null,
  });
});

// @route PUT /api/candidate/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "firstName",
    "lastName",
    "mobile",
    "experience",
    "currentCompany",
    "currentCTC",
    "expectedCTC",
    "noticePeriod",
    "technology",
    "resumeUrl",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });
  updates.profileCompleted = true;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, user: user.toSafeObject() });
});

// @route GET /api/candidate/interviews/:id
export const getInterviewDetail = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    candidate: req.user._id,
  }).populate("score recording");

  if (!interview) throw new ApiError(404, "Interview not found");
  res.json({ success: true, interview });
});

// @route GET /api/candidate/results
export const getResults = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({
    candidate: req.user._id,
    status: "COMPLETED",
  })
    .populate("score")
    .sort({ endedAt: -1 });

  res.json({ success: true, interviews });
});

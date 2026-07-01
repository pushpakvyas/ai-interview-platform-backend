import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Interview from "../models/Interview.js";
import Score from "../models/Score.js";
import { ApiError } from "../utils/apiError.js";

// @route GET /api/admin/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const [totalCandidates, scheduledInterviews, completedInterviews, pendingInterviews] =
    await Promise.all([
      User.countDocuments({ roleType: "CANDIDATE" }),
      Interview.countDocuments({ status: { $in: ["SCHEDULED", "RESCHEDULED"] } }),
      Interview.countDocuments({ status: "COMPLETED" }),
      Interview.countDocuments({ status: "SCHEDULED", scheduledDate: { $lt: new Date() } }),
    ]);

  const recentInterviews = await Interview.find({})
    .populate("candidate", "firstName lastName email")
    .populate("score")
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    success: true,
    stats: {
      totalCandidates,
      scheduledInterviews,
      completedInterviews,
      pendingInterviews,
    },
    recentInterviews,
  });
});

// @route GET /api/admin/candidates
export const listCandidates = asyncHandler(async (req, res) => {
  const { search, technology, page = 1, limit = 20 } = req.query;

  const query = { roleType: "CANDIDATE" };
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (technology) query.technology = technology;

  const candidates = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(query);

  res.json({ success: true, candidates, total, page: Number(page), limit: Number(limit) });
});

// @route GET /api/admin/interviews
export const listInterviews = asyncHandler(async (req, res) => {
  const { status, technology, candidate, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (technology) query.technology = technology;
  if (candidate) query.candidate = candidate;

  const interviews = await Interview.find(query)
    .populate("candidate", "firstName lastName email")
    .populate("score")
    .sort({ scheduledDate: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Interview.countDocuments(query);

  res.json({ success: true, interviews, total, page: Number(page), limit: Number(limit) });
});

// @route PUT /api/admin/candidates/:id/deactivate
export const deactivateCandidate = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, roleType: "CANDIDATE" },
    { isActive: false },
    { new: true }
  );
  if (!user) throw new ApiError(404, "Candidate not found");
  res.json({ success: true, user: user.toSafeObject() });
});

// @route PUT /api/admin/scores/:interviewId/override
export const overrideScore = asyncHandler(async (req, res) => {
  const { overriddenScore, overrideReason } = req.body;

  const score = await Score.findOne({ interview: req.params.interviewId });
  if (!score) throw new ApiError(404, "Score not found for this interview");

  score.overriddenByAdmin = true;
  score.overriddenScore = overriddenScore;
  score.overrideReason = overrideReason;
  score.overriddenBy = req.user._id;
  score.overriddenAt = new Date();
  await score.save();

  res.json({ success: true, score });
});

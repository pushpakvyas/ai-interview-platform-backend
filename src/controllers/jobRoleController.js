import asyncHandler from "express-async-handler";
import JobRole from "../models/JobRole.js";
import { ApiError } from "../utils/apiError.js";

// @route GET /api/job-roles
export const listJobRoles = asyncHandler(async (req, res) => {
  const jobRoles = await JobRole.find({ isActive: true }).populate("skills").sort({ name: 1 });
  res.json({ success: true, jobRoles });
});

// @route GET /api/job-roles/:id
export const getJobRole = asyncHandler(async (req, res) => {
  const jobRole = await JobRole.findById(req.params.id).populate("skills");
  if (!jobRole) throw new ApiError(404, "Job role not found");
  res.json({ success: true, jobRole });
});

// @route POST /api/job-roles  (admin)
export const createJobRole = asyncHandler(async (req, res) => {
  const { name, skills } = req.body;

  const existing = await JobRole.findOne({ name });
  if (existing) throw new ApiError(409, "A job role with this name already exists");

  const jobRole = await JobRole.create({ name, skills, createdBy: req.user._id });
  await jobRole.populate("skills");

  res.status(201).json({ success: true, jobRole });
});

// @route PUT /api/job-roles/:id  (admin)
export const updateJobRole = asyncHandler(async (req, res) => {
  const jobRole = await JobRole.findById(req.params.id);
  if (!jobRole) throw new ApiError(404, "Job role not found");

  const { skills } = req.body;
  if (skills) jobRole.skills = skills;

  await jobRole.save();
  await jobRole.populate("skills");
  res.json({ success: true, jobRole });
});

// @route DELETE /api/job-roles/:id  (admin, soft delete)
export const deactivateJobRole = asyncHandler(async (req, res) => {
  const jobRole = await JobRole.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!jobRole) throw new ApiError(404, "Job role not found");
  res.json({ success: true, jobRole });
});

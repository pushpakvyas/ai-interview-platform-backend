import asyncHandler from "express-async-handler";
import Skill from "../models/Skill.js";
import { ApiError } from "../utils/apiError.js";

function defaultPromptFragment(name) {
  return `Ask technical interview questions about ${name}, covering core concepts, common patterns, and best practices. Adjust question difficulty based on the candidate's responses.`;
}

// @route GET /api/skills
export const listSkills = asyncHandler(async (req, res) => {
  const skills = await Skill.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, skills });
});

// @route GET /api/skills/:id
export const getSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) throw new ApiError(404, "Skill not found");
  res.json({ success: true, skill });
});

// @route POST /api/skills  (admin) — name is the only required field so a
// skill can be added inline (e.g. from the Job Roles page) in one step; a
// sensible default prompt fragment is generated if none is supplied.
export const createSkill = asyncHandler(async (req, res) => {
  const { name, systemPromptFragment, evaluationCriteria } = req.body;

  const existing = await Skill.findOne({ name });
  if (existing) throw new ApiError(409, "A skill with this name already exists");

  const skill = await Skill.create({
    name,
    systemPromptFragment: systemPromptFragment || defaultPromptFragment(name),
    evaluationCriteria,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, skill });
});

// @route PUT /api/skills/:id  (admin)
export const updateSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) throw new ApiError(404, "Skill not found");

  const { systemPromptFragment, evaluationCriteria } = req.body;
  if (systemPromptFragment) skill.systemPromptFragment = systemPromptFragment;
  if (evaluationCriteria) skill.evaluationCriteria = evaluationCriteria;

  await skill.save();
  res.json({ success: true, skill });
});

// @route DELETE /api/skills/:id  (admin, soft delete)
export const deactivateSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!skill) throw new ApiError(404, "Skill not found");
  res.json({ success: true, skill });
});

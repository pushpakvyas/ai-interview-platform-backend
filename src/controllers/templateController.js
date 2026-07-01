import asyncHandler from "express-async-handler";
import TechnologyTemplate from "../models/TechnologyTemplate.js";
import { ApiError } from "../utils/apiError.js";

// @route GET /api/templates
export const listTemplates = asyncHandler(async (req, res) => {
  const templates = await TechnologyTemplate.find({ isActive: true }).sort({ technology: 1 });
  res.json({ success: true, templates });
});

// @route GET /api/templates/:id
export const getTemplate = asyncHandler(async (req, res) => {
  const template = await TechnologyTemplate.findById(req.params.id);
  if (!template) throw new ApiError(404, "Template not found");
  res.json({ success: true, template });
});

// @route POST /api/templates  (admin)
export const createTemplate = asyncHandler(async (req, res) => {
  const { technology, defaultSystemPrompt, questionBank, evaluationCriteria } = req.body;

  const existing = await TechnologyTemplate.findOne({ technology });
  if (existing) throw new ApiError(409, "Template for this technology already exists");

  const template = await TechnologyTemplate.create({
    technology,
    defaultSystemPrompt,
    questionBank,
    evaluationCriteria,
    promptVersions: [{ version: 1, systemPrompt: defaultSystemPrompt, updatedBy: req.user._id }],
  });

  res.status(201).json({ success: true, template });
});

// @route PUT /api/templates/:id  (admin) — modifies prompt, stores new version
export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await TechnologyTemplate.findById(req.params.id);
  if (!template) throw new ApiError(404, "Template not found");

  const { defaultSystemPrompt, questionBank, evaluationCriteria } = req.body;

  if (defaultSystemPrompt && defaultSystemPrompt !== template.defaultSystemPrompt) {
    const nextVersion = (template.promptVersions.at(-1)?.version || 0) + 1;
    template.promptVersions.push({
      version: nextVersion,
      systemPrompt: defaultSystemPrompt,
      updatedBy: req.user._id,
    });
    template.defaultSystemPrompt = defaultSystemPrompt;
  }

  if (questionBank) template.questionBank = questionBank;
  if (evaluationCriteria) template.evaluationCriteria = evaluationCriteria;

  await template.save();
  res.json({ success: true, template });
});

// @route DELETE /api/templates/:id  (admin, soft delete)
export const deactivateTemplate = asyncHandler(async (req, res) => {
  const template = await TechnologyTemplate.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!template) throw new ApiError(404, "Template not found");
  res.json({ success: true, template });
});

import express from 'express';
import { SupportSurvey, SurveyResponse } from '../../../models/SupportSurvey.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// SURVEYS
// ============================================

// Get all surveys
router.get('/', asyncHandler(async (req, res) => {
  const { is_active, survey_type } = req.query;
  const filter: any = {};

  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (survey_type) filter.survey_type = survey_type;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    SupportSurvey.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, SupportSurvey
  );

  res.json(paginatedResult);
}));

// Get survey by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const survey = await SupportSurvey.findById(req.params.id).lean();
  if (!survey) {
    return res.status(404).json({ error: 'Survey not found' });
  }

  const response_count = await SurveyResponse.countDocuments({ survey_id: req.params.id });

  res.json({ ...survey, id: (survey as any)._id, response_count });
}));

// Create survey
router.post('/', asyncHandler(async (req, res) => {
  const { name, survey_type, description, questions, trigger_event, is_active } = req.body;

  if (!name || !survey_type || !questions) {
    return res.status(400).json({ error: 'Name, survey_type, and questions are required' });
  }

  const survey = await SupportSurvey.create({
    name,
    survey_type,
    description,
    questions,
    trigger_event,
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(201).json(survey);
}));

// Update survey
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, questions, trigger_event, is_active } = req.body;
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (questions !== undefined) updateData.questions = questions;
  if (trigger_event !== undefined) updateData.trigger_event = trigger_event;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await SupportSurvey.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Survey not found' });
  }

  res.json(result);
}));

// ============================================
// SURVEY RESPONSES
// ============================================

// Submit survey response
router.post('/:id/responses', asyncHandler(async (req, res) => {
  const { ticket_id, partner_id, responses, score, feedback } = req.body;

  if (!responses) {
    return res.status(400).json({ error: 'Responses are required' });
  }

  const response = await SurveyResponse.create({
    survey_id: req.params.id,
    ticket_id,
    partner_id,
    responses,
    score,
    feedback,
  });

  res.status(201).json(response);
}));

// Get survey responses
router.get('/:id/responses', asyncHandler(async (req, res) => {
  const filter = { survey_id: req.params.id };
  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    SurveyResponse.find(filter)
      .populate('ticket_id', 'ticket_number')
      .populate('partner_id', 'name')
      .sort({ submitted_at: -1 })
      .lean(),
    pagination, filter, SurveyResponse
  );

  const data = paginatedResult.data.map((r: any) => ({
    ...r,
    id: r._id,
    ticket_number: r.ticket_id?.ticket_number,
    partner_name: r.partner_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get survey analytics
router.get('/:id/analytics', asyncHandler(async (req, res) => {
  const responses = await SurveyResponse.find({ survey_id: req.params.id }).select('score responses').lean();

  const scores = responses.map((r: any) => r.score).filter((s: any): s is number => s !== null && s !== undefined);
  const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

  const distribution: Record<number, number> = {};
  scores.forEach((score: number) => {
    distribution[score] = (distribution[score] || 0) + 1;
  });

  res.json({
    total_responses: responses.length,
    average_score: avgScore,
    score_distribution: distribution,
  });
}));

export default router;

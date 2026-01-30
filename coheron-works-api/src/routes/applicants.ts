import express from 'express';
import { Applicant } from '../models/Applicant.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get applicants
router.get('/', asyncHandler(async (req, res) => {
  const { stage_id } = req.query;
  const filter: any = {};

  if (stage_id) {
    filter.stage_id = stage_id;
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Applicant.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    Applicant
  );
  res.json(result);
}));

// Create applicant
router.post('/', asyncHandler(async (req, res) => {
  const { partner_name, name, email_from, stage_id, priority } = req.body;

  const applicant = await Applicant.create({
    partner_name, name, email_from,
    stage_id: stage_id || 1,
    priority: priority || 0
  });

  res.status(201).json(applicant);
}));

// Update applicant
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stage_id, priority } = req.body;

  const updateFields: any = {};
  if (stage_id !== undefined) updateFields.stage_id = stage_id;
  if (priority !== undefined) updateFields.priority = priority;

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const applicant = await Applicant.findByIdAndUpdate(id, updateFields, { new: true });

  if (!applicant) {
    return res.status(404).json({ error: 'Applicant not found' });
  }
  res.json(applicant);
}));

export default router;

import express from 'express';
import { SlaPolicy } from '../models/SlaPolicy.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// SLA POLICIES
// ============================================

// Get all SLA policies
router.get('/', asyncHandler(async (req, res) => {
  const { is_active, priority } = req.query;
  const filter: any = {};

  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (priority) filter.priority = priority;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    SlaPolicy.find(filter).sort({ priority: 1, name: 1 }).lean(),
    pagination, filter, SlaPolicy
  );

  res.json(paginatedResult);
}));

// Get SLA policy by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const policy = await SlaPolicy.findById(req.params.id).lean();
  if (!policy) {
    return res.status(404).json({ error: 'SLA policy not found' });
  }
  res.json(policy);
}));

// Create SLA policy
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, priority, first_response_time_minutes, resolution_time_minutes, business_hours_only, working_hours, timezone } = req.body;

  if (!name || !priority || !first_response_time_minutes || !resolution_time_minutes) {
    return res.status(400).json({
      error: 'Name, priority, first_response_time_minutes, and resolution_time_minutes are required',
    });
  }

  const policy = await SlaPolicy.create({
    name,
    description,
    priority,
    first_response_time_minutes,
    resolution_time_minutes,
    business_hours_only: business_hours_only || false,
    working_hours: working_hours || null,
    timezone: timezone || 'UTC',
  });

  res.status(201).json(policy);
}));

// Update SLA policy
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, priority, first_response_time_minutes, resolution_time_minutes, business_hours_only, working_hours, timezone, is_active } = req.body;
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (priority !== undefined) updateData.priority = priority;
  if (first_response_time_minutes !== undefined) updateData.first_response_time_minutes = first_response_time_minutes;
  if (resolution_time_minutes !== undefined) updateData.resolution_time_minutes = resolution_time_minutes;
  if (business_hours_only !== undefined) updateData.business_hours_only = business_hours_only;
  if (working_hours !== undefined) updateData.working_hours = working_hours;
  if (timezone !== undefined) updateData.timezone = timezone;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await SlaPolicy.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'SLA policy not found' });
  }

  res.json(result);
}));

// Delete SLA policy
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await SlaPolicy.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'SLA policy not found' });
  }
  res.json({ message: 'SLA policy deleted successfully' });
}));

export default router;

import express from 'express';
import { Activity } from '../../../shared/models/Activity.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get activities for a resource
router.get('/', asyncHandler(async (req, res) => {
  const { res_id, res_model } = req.query;

  if (!res_id || !res_model) {
    return res.status(400).json({ error: 'res_id and res_model are required' });
  }

  const filter: any = { res_id, res_model };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Activity.find(filter)
      .populate('user_id', 'name')
      .sort({ date_deadline: -1, created_at: -1 })
      .lean(),
    pagination,
    filter,
    Activity
  );

  const data = paginatedResult.data.map((a: any) => ({
    ...a,
    user_name: a.user_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create activity
router.post('/', asyncHandler(async (req, res) => {
  const { res_id, res_model, activity_type, summary, description, date_deadline, user_id, state, duration } = req.body;

  const activity = await Activity.create({
    res_id,
    res_model,
    activity_type: activity_type || 'note',
    summary,
    description,
    date_deadline,
    user_id: user_id || undefined,
    state: state || 'planned',
    duration,
  });

  res.status(201).json(activity);
}));

// Update activity
router.put('/:id', asyncHandler(async (req, res) => {
  const { summary, description, state, date_deadline, duration } = req.body;

  const updateData: any = {};
  if (summary !== undefined) updateData.summary = summary;
  if (description !== undefined) updateData.description = description;
  if (state !== undefined) updateData.state = state;
  if (date_deadline !== undefined) updateData.date_deadline = date_deadline;
  if (duration !== undefined) updateData.duration = duration;

  const activity = await Activity.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  res.json(activity);
}));

// Delete activity
router.delete('/:id', asyncHandler(async (req, res) => {
  const activity = await Activity.findByIdAndDelete(req.params.id);

  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  res.json({ message: 'Activity deleted successfully' });
}));

export default router;

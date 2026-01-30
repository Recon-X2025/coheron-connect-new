import express from 'express';
import Sprint from '../../../models/Sprint.js';
import SprintRetrospective from '../../../models/SprintRetrospective.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// SPRINT RETROSPECTIVES
// ============================================

// Get retrospective for a sprint
router.get('/sprints/:id/retrospective', asyncHandler(async (req, res) => {
  const retro = await SprintRetrospective.findOne({ sprint_id: req.params.id })
    .populate('facilitator_id', 'name')
    .lean();

  if (!retro) {
    return res.json({
      sprint_id: req.params.id,
      what_went_well: [],
      what_could_improve: [],
      action_items: [],
      notes: null,
      status: 'draft',
    });
  }

  const items = (retro as any).items || [];
  const grouped: any = {};
  for (const item of items) {
    const cat = (item as any).category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  res.json({
    ...retro,
    facilitator_name: (retro.facilitator_id as any)?.name,
    what_went_well: grouped.went_well || [],
    what_could_improve: grouped.could_improve || [],
    action_items: grouped.action_item || [],
  });
}));

// Create or Update Retrospective
router.post('/sprints/:id/retrospective', asyncHandler(async (req, res) => {
  const { facilitator_id, notes, status, items } = req.body;

  // Verify sprint exists
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const updateData: any = {
    sprint_id: req.params.id,
    facilitator_id,
    notes,
    status: status || 'draft',
  };

  if (items && Array.isArray(items)) {
    updateData.items = items.map((item: any) => ({
      category: item.category,
      content: item.content,
      assignee_id: item.assignee_id,
      due_date: item.due_date,
      status: item.status || 'open',
    }));
  }

  const retro = await SprintRetrospective.findOneAndUpdate(
    { sprint_id: req.params.id },
    updateData,
    { upsert: true, new: true }
  );

  res.json({ id: retro._id, message: 'Retrospective saved successfully' });
}));

// Add Retrospective Item
router.post('/sprints/:id/retrospective/items', asyncHandler(async (req, res) => {
  const { category, content, assignee_id, due_date, status } = req.body;

  if (!category || !content) {
    return res.status(400).json({ error: 'Category and content are required' });
  }

  // Get or create retrospective
  let retro = await SprintRetrospective.findOne({ sprint_id: req.params.id });

  if (!retro) {
    retro = await SprintRetrospective.create({
      sprint_id: req.params.id,
      status: 'draft',
      items: [],
    });
  }

  const newItem = {
    category,
    content,
    assignee_id,
    due_date,
    status: status || 'open',
  };

  retro.items.push(newItem as any);
  await retro.save();

  const addedItem = retro.items[retro.items.length - 1];
  res.status(201).json(addedItem);
}));

export default router;

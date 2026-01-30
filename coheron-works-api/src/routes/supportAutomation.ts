import express from 'express';
import { SupportAutomation } from '../models/SupportAutomation.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// AUTOMATION RULES
// ============================================

// Get all automation rules
router.get('/', asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};

  if (is_active !== undefined) {
    filter.is_active = is_active === 'true';
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SupportAutomation.find(filter).sort({ execution_order: 1, name: 1 }).lean(),
    pagination,
    filter,
    SupportAutomation
  );
  res.json(result);
}));

// Get automation rule by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const rule = await SupportAutomation.findById(req.params.id).lean();
  if (!rule) {
    return res.status(404).json({ error: 'Automation rule not found' });
  }
  res.json(rule);
}));

// Create automation rule
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, trigger_event, trigger_conditions, actions, is_active, execution_order } = req.body;

  if (!name || !trigger_event || !trigger_conditions || !actions) {
    return res.status(400).json({
      error: 'Name, trigger_event, trigger_conditions, and actions are required',
    });
  }

  const rule = await SupportAutomation.create({
    name,
    description,
    trigger_event,
    trigger_conditions,
    actions,
    is_active: is_active !== undefined ? is_active : true,
    execution_order: execution_order || 0,
  });

  res.status(201).json(rule);
}));

// Update automation rule
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, trigger_event, trigger_conditions, actions, is_active, execution_order } = req.body;
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (trigger_event !== undefined) updateData.trigger_event = trigger_event;
  if (trigger_conditions !== undefined) updateData.trigger_conditions = trigger_conditions;
  if (actions !== undefined) updateData.actions = actions;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (execution_order !== undefined) updateData.execution_order = execution_order;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await SupportAutomation.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Automation rule not found' });
  }

  res.json(result);
}));

// Delete automation rule
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await SupportAutomation.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Automation rule not found' });
  }
  res.json({ message: 'Automation rule deleted successfully' });
}));

// Test automation rule (dry run)
router.post('/:id/test', asyncHandler(async (req, res) => {
  const rule = await SupportAutomation.findById(req.params.id).lean();
  if (!rule) {
    return res.status(404).json({ error: 'Automation rule not found' });
  }

  const { test_ticket } = req.body;

  res.json({
    message: 'Rule would execute',
    conditions_met: true,
    actions_that_would_run: rule.actions,
  });
}));

export default router;

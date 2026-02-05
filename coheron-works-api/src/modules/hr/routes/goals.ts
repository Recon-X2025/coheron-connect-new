import express from 'express';
import { Goal } from '../../../models/Goal.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get goals
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { employee_id, status, goal_type } = req.query;
  const filter: any = {};

  if (employee_id) {
    filter.employee_id = employee_id;
  }
  if (status) {
    filter.status = status;
  }
  if (goal_type) {
    filter.goal_type = goal_type;
  }

  const goals = await Goal.find(filter)
    .populate('employee_id', 'name employee_id')
    .sort({ created_at: -1 });

  const result = goals.map((g: any) => {
    const obj = g.toJSON();
    if (obj.employee_id && typeof obj.employee_id === 'object') {
      obj.employee_name = obj.employee_id.name;
      obj.emp_id = obj.employee_id.employee_id;
      obj.employee_id = obj.employee_id._id;
    }
    return obj;
  });

  res.json(result);
}));

// Get goal by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const goal = await Goal.findById(id)
    .populate('employee_id', 'name employee_id');

  if (!goal) {
    return res.status(404).json({ error: 'Goal not found' });
  }

  const obj: any = goal.toJSON();
  if (obj.employee_id && typeof obj.employee_id === 'object') {
    obj.employee_name = obj.employee_id.name;
    obj.emp_id = obj.employee_id.employee_id;
    obj.employee_id = obj.employee_id._id;
  }

  res.json(obj);
}));

// Create goal
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    employee_id,
    title,
    description,
    goal_type,
    target_value,
    current_value,
    status,
    due_date,
  } = req.body;

  if (!employee_id || !title) {
    return res.status(400).json({ error: 'Employee ID and title are required' });
  }

  const goal = await Goal.create({
    employee_id,
    title,
    description: description || null,
    goal_type: goal_type || 'okr',
    target_value: target_value || null,
    current_value: current_value || 0,
    status: status || 'on_track',
    due_date: due_date || null,
  });

  res.status(201).json(goal);
}));

// Update goal
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    goal_type,
    target_value,
    current_value,
    status,
    due_date,
  } = req.body;

  const updateFields: any = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (goal_type !== undefined) updateFields.goal_type = goal_type;
  if (target_value !== undefined) updateFields.target_value = target_value;
  if (current_value !== undefined) updateFields.current_value = current_value;
  if (status !== undefined) updateFields.status = status;
  if (due_date !== undefined) updateFields.due_date = due_date;

  const goal = await Goal.findByIdAndUpdate(id, updateFields, { new: true });

  if (!goal) {
    return res.status(404).json({ error: 'Goal not found' });
  }
  res.json(goal);
}));

// Delete goal
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const goal = await Goal.findByIdAndDelete(id);

  if (!goal) {
    return res.status(404).json({ error: 'Goal not found' });
  }
  res.json({ message: 'Goal deleted successfully' });
}));

export default router;

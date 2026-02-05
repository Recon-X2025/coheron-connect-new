import express from 'express';
import mongoose from 'mongoose';
import { CrmTask, CalendarEvent, CrmAutomationWorkflow } from '../../../models/CrmTask.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// CRM TASKS
// ============================================

// Get all tasks
router.get('/tasks', authenticate, asyncHandler(async (req, res) => {
  const { user_id, assigned_to_id, state, task_type, related_model, related_id, start_date, end_date, search } = req.query;
  const filter: any = {};

  if (user_id) {
    filter.$or = [{ assigned_to_id: user_id }, { created_by_id: user_id }];
  }
  if (assigned_to_id) filter.assigned_to_id = assigned_to_id;
  if (state) filter.state = state;
  if (task_type) filter.task_type = task_type;
  if (related_model) filter.related_model = related_model;
  if (related_id) filter.related_id = related_id;
  if (start_date) filter.due_date = { ...filter.due_date, $gte: start_date };
  if (end_date) filter.due_date = { ...filter.due_date, $lte: end_date };
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
      { description: { $regex: search as string, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    CrmTask.find(filter)
      .populate('assigned_to_id', 'name')
      .populate('created_by_id', 'name')
      .sort({ due_date: 1, priority: -1 })
      .lean(),
    pagination,
    filter,
    CrmTask
  );

  const data = paginatedResult.data.map((t: any) => ({
    ...t,
    assigned_to_name: t.assigned_to_id?.name,
    created_by_name: t.created_by_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get task by ID
router.get('/tasks/:id', authenticate, asyncHandler(async (req, res) => {
  const task = await CrmTask.findById(req.params.id)
    .populate('assigned_to_id', 'name')
    .populate('created_by_id', 'name')
    .lean() as any;

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const result = {
    ...task,
    assigned_to_name: (task.assigned_to_id as any)?.name,
    created_by_name: (task.created_by_id as any)?.name,
  };

  res.json(result);
}));

// Create task
router.post('/tasks', authenticate, asyncHandler(async (req, res) => {
  const {
    name, description, task_type, priority, state,
    assigned_to_id, created_by_id, due_date, related_model, related_id, reminder_date,
  } = req.body;

  const task = await CrmTask.create({
    name,
    description,
    task_type: task_type || 'task',
    priority: priority || 'medium',
    state: state || 'pending',
    assigned_to_id,
    created_by_id,
    due_date,
    related_model,
    related_id,
    reminder_date,
  });

  res.status(201).json(task);
}));

// Update task
router.put('/tasks/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, description, task_type, priority, state, assigned_to_id, due_date, reminder_date } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (task_type !== undefined) updateData.task_type = task_type;
  if (priority !== undefined) updateData.priority = priority;
  if (state !== undefined) updateData.state = state;
  if (assigned_to_id !== undefined) updateData.assigned_to_id = assigned_to_id;
  if (due_date !== undefined) updateData.due_date = due_date;
  if (reminder_date !== undefined) updateData.reminder_date = reminder_date;

  const task = await CrmTask.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
}));

// Delete task
router.delete('/tasks/:id', authenticate, asyncHandler(async (req, res) => {
  const task = await CrmTask.findByIdAndDelete(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ message: 'Task deleted successfully' });
}));

// ============================================
// CALENDAR EVENTS
// ============================================

// Get all events
router.get('/events', authenticate, asyncHandler(async (req, res) => {
  const { user_id, start_date, end_date, event_type, related_model, related_id } = req.query;
  const filter: any = {};

  if (user_id) {
    filter.$or = [{ organizer_id: user_id }, { attendee_ids: user_id }];
  }
  if (start_date) filter.start_date = { ...filter.start_date, $gte: start_date };
  if (end_date) filter.end_date = { ...filter.end_date, $lte: end_date };
  if (event_type) filter.event_type = event_type;
  if (related_model) filter.related_model = related_model;
  if (related_id) filter.related_id = related_id;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    CalendarEvent.find(filter)
      .populate('created_by_id', 'name')
      .sort({ start_date: 1, start_time: 1 })
      .lean(),
    pagination,
    filter,
    CalendarEvent
  );

  const data = paginatedResult.data.map((e: any) => ({
    ...e,
    created_by_name: e.created_by_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get event by ID
router.get('/events/:id', authenticate, asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findById(req.params.id)
    .populate('created_by_id', 'name')
    .lean() as any;

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const result = {
    ...event,
    created_by_name: (event.created_by_id as any)?.name,
  };

  res.json(result);
}));

// Create event
router.post('/events', authenticate, asyncHandler(async (req, res) => {
  const {
    title, description, event_type, start_date, start_time, end_date, end_time,
    all_day, location, organizer_id, attendee_ids, related_model, related_id,
    reminder_minutes, created_by_id,
  } = req.body;

  const event = await CalendarEvent.create({
    title,
    description,
    event_type: event_type || 'meeting',
    start_date,
    start_time,
    end_date,
    end_time,
    all_day: all_day !== undefined ? all_day : false,
    location,
    organizer_id,
    attendee_ids: attendee_ids || [],
    related_model,
    related_id,
    reminder_minutes,
    created_by_id,
  });

  res.status(201).json(event);
}));

// Update event
router.put('/events/:id', authenticate, asyncHandler(async (req, res) => {
  const {
    title, description, event_type, start_date, start_time, end_date, end_time,
    all_day, location, organizer_id, attendee_ids, reminder_minutes,
  } = req.body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (event_type !== undefined) updateData.event_type = event_type;
  if (start_date !== undefined) updateData.start_date = start_date;
  if (start_time !== undefined) updateData.start_time = start_time;
  if (end_date !== undefined) updateData.end_date = end_date;
  if (end_time !== undefined) updateData.end_time = end_time;
  if (all_day !== undefined) updateData.all_day = all_day;
  if (location !== undefined) updateData.location = location;
  if (organizer_id !== undefined) updateData.organizer_id = organizer_id;
  if (attendee_ids !== undefined) updateData.attendee_ids = attendee_ids;
  if (reminder_minutes !== undefined) updateData.reminder_minutes = reminder_minutes;

  const event = await CalendarEvent.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json(event);
}));

// Delete event
router.delete('/events/:id', authenticate, asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findByIdAndDelete(req.params.id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json({ message: 'Event deleted successfully' });
}));

// ============================================
// AUTOMATION WORKFLOWS
// ============================================

// Get all workflows
router.get('/automation/workflows', authenticate, asyncHandler(async (req, res) => {
  const { is_active, trigger_type } = req.query;
  const filter: any = {};

  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (trigger_type) filter.trigger_type = trigger_type;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    CrmAutomationWorkflow.find(filter).sort({ name: 1 }).lean(),
    pagination,
    filter,
    CrmAutomationWorkflow
  );
  res.json(result);
}));

// Get workflow by ID
router.get('/automation/workflows/:id', authenticate, asyncHandler(async (req, res) => {
  const workflow = await CrmAutomationWorkflow.findById(req.params.id).lean();

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json(workflow);
}));

// Create workflow
router.post('/automation/workflows', authenticate, asyncHandler(async (req, res) => {
  const { name, description, trigger_type, trigger_config, actions, conditions, is_active } = req.body;

  const workflow = await CrmAutomationWorkflow.create({
    name,
    description,
    trigger_type,
    trigger_config: trigger_config || null,
    actions: actions || null,
    conditions: conditions || null,
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(201).json(workflow);
}));

// Update workflow
router.put('/automation/workflows/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, description, trigger_type, trigger_config, actions, conditions, is_active } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
  if (trigger_config !== undefined) updateData.trigger_config = trigger_config;
  if (actions !== undefined) updateData.actions = actions;
  if (conditions !== undefined) updateData.conditions = conditions;
  if (is_active !== undefined) updateData.is_active = is_active;

  const workflow = await CrmAutomationWorkflow.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json(workflow);
}));

// Delete workflow
router.delete('/automation/workflows/:id', authenticate, asyncHandler(async (req, res) => {
  const workflow = await CrmAutomationWorkflow.findByIdAndDelete(req.params.id);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json({ message: 'Workflow deleted successfully' });
}));

// Execute workflow
router.post('/automation/workflows/:id/execute', authenticate, asyncHandler(async (req, res) => {
  const { record_id, record_model } = req.body;

  if (!record_id || !record_model) {
    return res.status(400).json({ error: 'record_id and record_model are required' });
  }

  // Load workflow and verify it's active
  const workflow: any = await CrmAutomationWorkflow.findById(req.params.id).lean();
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  if (!workflow.is_active) {
    return res.status(400).json({ error: 'Workflow is not active' });
  }

  // Load the target record
  const Model = mongoose.models[record_model];
  if (!Model) {
    return res.status(400).json({ error: `Unknown model: ${record_model}` });
  }

  const record: any = await Model.findById(record_id).lean();
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Evaluate conditions
  const conditions: any[] = Array.isArray(workflow.conditions) ? workflow.conditions : [];
  const conditionsPassed = conditions.every((condition: any) => {
    const fieldValue = record[condition.field];
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return String(fieldValue) === String(targetValue);
      case 'not_equals':
        return String(fieldValue) !== String(targetValue);
      case 'contains':
        return String(fieldValue ?? '').includes(String(targetValue));
      case 'greater_than':
        return Number(fieldValue) > Number(targetValue);
      case 'less_than':
        return Number(fieldValue) < Number(targetValue);
      default:
        return false;
    }
  });

  if (!conditionsPassed) {
    return res.json({
      message: 'Workflow conditions not met',
      workflow_id: req.params.id,
      executed: false,
    });
  }

  // Execute actions
  const actions: any[] = Array.isArray(workflow.actions) ? workflow.actions : [];
  const results: any[] = [];

  for (const action of actions) {
    switch (action.type) {
      case 'update_field': {
        await Model.findByIdAndUpdate(record_id, {
          [action.field]: action.value,
        });
        results.push({ type: 'update_field', field: action.field, status: 'done' });
        break;
      }
      case 'create_task': {
        const task = await CrmTask.create({
          name: action.task_name || `Task from workflow: ${workflow.name}`,
          description: action.task_description || '',
          task_type: action.task_type || 'task',
          priority: action.priority || 'medium',
          state: 'pending',
          assigned_to_id: action.assigned_to_id || null,
          related_model: record_model,
          related_id: record_id,
          due_date: action.due_date || null,
        });
        results.push({ type: 'create_task', task_id: task._id, status: 'done' });
        break;
      }
      case 'send_notification': {
        const message = action.message || `Workflow "${workflow.name}" triggered for ${record_model} ${record_id}`;
        console.log(`[CRM Notification] ${message}`);
        results.push({ type: 'send_notification', message, status: 'done' });
        break;
      }
      default:
        results.push({ type: action.type, status: 'unknown_action' });
    }
  }

  res.json({
    message: 'Workflow executed successfully',
    workflow_id: req.params.id,
    executed: true,
    results,
  });
}));

export default router;

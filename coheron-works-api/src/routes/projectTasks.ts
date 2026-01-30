import express from 'express';
import ProjectMilestone from '../models/ProjectMilestone.js';
import ProjectTask from '../models/ProjectTask.js';
import TaskDependency from '../models/TaskDependency.js';
import TaskChecklist from '../models/TaskChecklist.js';
import TaskComment from '../models/TaskComment.js';
import TaskAttachment from '../models/TaskAttachment.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// MILESTONES (WBS)
// ============================================

// Get all milestones for a project
router.get('/:projectId/milestones', asyncHandler(async (req, res) => {
  const milestones = await ProjectMilestone.find({ project_id: req.params.projectId })
    .sort({ planned_start_date: 1 });

  // Enrich with task counts
  const result = await Promise.all(milestones.map(async (m) => {
    const taskAgg = await ProjectTask.aggregate([
      { $match: { milestone_id: m._id } },
      {
        $group: {
          _id: null,
          task_count: { $sum: 1 },
          completed_tasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
    ]);
    const obj: any = m.toObject();
    obj.task_count = taskAgg[0]?.task_count || 0;
    obj.completed_tasks = taskAgg[0]?.completed_tasks || 0;
    return obj;
  }));

  res.json(result);
}));

// Create milestone
router.post('/:projectId/milestones', asyncHandler(async (req, res) => {
  const { name, description, planned_start_date, planned_end_date, is_critical } = req.body;

  const milestone = await ProjectMilestone.create({
    project_id: req.params.projectId,
    name,
    description,
    planned_start_date,
    planned_end_date,
    is_critical: is_critical || false,
  });

  res.status(201).json(milestone);
}));

// Update milestone
router.put('/milestones/:id', asyncHandler(async (req, res) => {
  const { name, description, planned_start_date, planned_end_date, actual_start_date, actual_end_date, status, is_critical } = req.body;

  const fields: Record<string, any> = {
    name, description, planned_start_date, planned_end_date,
    actual_start_date, actual_end_date, status, is_critical,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const milestone = await ProjectMilestone.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!milestone) {
    return res.status(404).json({ error: 'Milestone not found' });
  }

  res.json(milestone);
}));

// Delete milestone
router.delete('/milestones/:id', asyncHandler(async (req, res) => {
  const milestone = await ProjectMilestone.findByIdAndDelete(req.params.id);

  if (!milestone) {
    return res.status(404).json({ error: 'Milestone not found' });
  }

  res.json({ message: 'Milestone deleted successfully' });
}));

// ============================================
// TASKS
// ============================================

// Get all tasks for a project
router.get('/:projectId/tasks', asyncHandler(async (req, res) => {
  const { status, assignee_id, milestone_id, task_type } = req.query;
  const filter: any = { project_id: req.params.projectId };

  if (status) filter.status = status;
  if (assignee_id) filter.assignee_id = assignee_id;
  if (milestone_id) filter.milestone_id = milestone_id;
  if (task_type) filter.task_type = task_type;

  const tasks = await ProjectTask.find(filter)
    .populate('assignee_id', 'name')
    .populate('reporter_id', 'name')
    .populate('milestone_id', 'name')
    .sort({ created_at: -1 });

  // Enrich with comment/checklist counts
  const result = await Promise.all(tasks.map(async (t) => {
    const obj: any = t.toObject();
    if (obj.assignee_id) { obj.assignee_name = obj.assignee_id.name; }
    if (obj.reporter_id) { obj.reporter_name = obj.reporter_id.name; }
    if (obj.milestone_id) { obj.milestone_name = obj.milestone_id.name; }
    obj.comment_count = await TaskComment.countDocuments({ task_id: t._id });
    obj.incomplete_checklist_items = await TaskChecklist.countDocuments({ task_id: t._id, is_completed: false });
    return obj;
  }));

  res.json(result);
}));

// Get task by ID with full details
router.get('/tasks/:id', asyncHandler(async (req, res) => {
  const task = await ProjectTask.findById(req.params.id)
    .populate('assignee_id', 'name')
    .populate('reporter_id', 'name')
    .populate('milestone_id', 'name');

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const obj: any = task.toObject();
  if (obj.assignee_id) { obj.assignee_name = obj.assignee_id.name; }
  if (obj.reporter_id) { obj.reporter_name = obj.reporter_id.name; }
  if (obj.milestone_id) { obj.milestone_name = obj.milestone_id.name; }

  // Get subtasks
  const subtasks = await ProjectTask.find({ parent_task_id: task._id }).sort({ created_at: 1 }).lean();

  // Get dependencies
  const dependencies = await TaskDependency.find({ task_id: task._id })
    .populate('depends_on_task_id', 'name')
    .lean();
  const depRows = dependencies.map((d: any) => {
    if (d.depends_on_task_id) { d.depends_on_task_name = d.depends_on_task_id.name; }
    return d;
  });

  // Get checklists
  const checklists = await TaskChecklist.find({ task_id: task._id })
    .populate('completed_by', 'name')
    .sort({ created_at: 1 })
    .lean();
  const checklistRows = checklists.map((c: any) => {
    if (c.completed_by) { c.completed_by_name = c.completed_by.name; }
    return c;
  });

  // Get comments
  const comments = await TaskComment.find({ task_id: task._id })
    .populate('user_id', 'name email')
    .sort({ created_at: 1 })
    .lean();
  const commentRows = comments.map((c: any) => {
    if (c.user_id) {
      c.user_name = c.user_id.name;
      c.user_email = c.user_id.email;
    }
    return c;
  });

  // Get attachments
  const attachments = await TaskAttachment.find({ task_id: task._id })
    .populate('uploaded_by', 'name')
    .sort({ created_at: 1 })
    .lean();
  const attachmentRows = attachments.map((a: any) => {
    if (a.uploaded_by) { a.uploaded_by_name = a.uploaded_by.name; }
    return a;
  });

  res.json({
    ...obj,
    subtasks,
    dependencies: depRows,
    checklists: checklistRows,
    comments: commentRows,
    attachments: attachmentRows,
  });
}));

// Create task
router.post('/:projectId/tasks', asyncHandler(async (req, res) => {
  const {
    milestone_id, parent_task_id, name, description, task_type, priority,
    status, assignee_id, reporter_id, planned_start_date, planned_end_date,
    estimated_hours, story_points, due_date, is_billable,
  } = req.body;

  const task = await ProjectTask.create({
    project_id: req.params.projectId,
    milestone_id, parent_task_id, name, description,
    task_type: task_type || 'task',
    priority: priority || 'medium',
    status: status || 'backlog',
    assignee_id, reporter_id,
    planned_start_date, planned_end_date, estimated_hours,
    story_points, due_date,
    is_billable: is_billable !== undefined ? is_billable : true,
  });

  res.status(201).json(task);
}));

// Update task
router.put('/tasks/:id', asyncHandler(async (req, res) => {
  const {
    milestone_id, parent_task_id, name, description, task_type, priority,
    status, assignee_id, reporter_id, planned_start_date, planned_end_date,
    actual_start_date, actual_end_date, estimated_hours, actual_hours,
    story_points, due_date, is_billable,
  } = req.body;

  const fields: Record<string, any> = {
    milestone_id, parent_task_id, name, description, task_type, priority,
    status, assignee_id, reporter_id, planned_start_date, planned_end_date,
    actual_start_date, actual_end_date, estimated_hours, actual_hours,
    story_points, due_date, is_billable,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  // Auto-set actual_start_date when status changes to in_progress
  if (status === 'in_progress' && !req.body.actual_start_date) {
    updateData.actual_start_date = new Date();
  }

  // Auto-set actual_end_date when status changes to done
  if (status === 'done' && !req.body.actual_end_date) {
    updateData.actual_end_date = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const task = await ProjectTask.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
}));

// Delete task
router.delete('/tasks/:id', asyncHandler(async (req, res) => {
  const task = await ProjectTask.findByIdAndDelete(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ message: 'Task deleted successfully' });
}));

// ============================================
// TASK DEPENDENCIES
// ============================================

// Add task dependency
router.post('/tasks/:id/dependencies', asyncHandler(async (req, res) => {
  const { depends_on_task_id, dependency_type } = req.body;

  if (req.params.id === depends_on_task_id) {
    return res.status(400).json({ error: 'Task cannot depend on itself' });
  }

  const dep = await TaskDependency.create({
    task_id: req.params.id,
    depends_on_task_id,
    dependency_type: dependency_type || 'finish_to_start',
  });

  res.status(201).json(dep);
}));

// Remove task dependency
router.delete('/tasks/:id/dependencies/:dependencyId', asyncHandler(async (req, res) => {
  const result = await TaskDependency.findOneAndDelete({
    _id: req.params.dependencyId,
    task_id: req.params.id,
  });

  if (!result) {
    return res.status(404).json({ error: 'Dependency not found' });
  }

  res.json({ message: 'Dependency removed successfully' });
}));

// ============================================
// TASK CHECKLISTS
// ============================================

// Add checklist item
router.post('/tasks/:id/checklists', asyncHandler(async (req, res) => {
  const { item_text } = req.body;

  const checklist = await TaskChecklist.create({
    task_id: req.params.id,
    item_text,
  });

  res.status(201).json(checklist);
}));

// Update checklist item
router.put('/checklists/:id', asyncHandler(async (req, res) => {
  const { item_text, is_completed, completed_by } = req.body;

  const updateData: any = {};

  if (item_text !== undefined) {
    updateData.item_text = item_text;
  }

  if (is_completed !== undefined) {
    updateData.is_completed = is_completed;
    if (is_completed) {
      updateData.completed_at = new Date();
      if (completed_by) {
        updateData.completed_by = completed_by;
      }
    } else {
      updateData.completed_at = null;
      updateData.completed_by = null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const checklist = await TaskChecklist.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!checklist) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  res.json(checklist);
}));

// Delete checklist item
router.delete('/checklists/:id', asyncHandler(async (req, res) => {
  const checklist = await TaskChecklist.findByIdAndDelete(req.params.id);

  if (!checklist) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  res.json({ message: 'Checklist item deleted successfully' });
}));

// ============================================
// TASK COMMENTS
// ============================================

// Add comment
router.post('/tasks/:id/comments', asyncHandler(async (req, res) => {
  const { comment_text, parent_comment_id, user_id } = req.body;

  const comment = await TaskComment.create({
    task_id: req.params.id,
    user_id,
    comment_text,
    parent_comment_id,
  });

  res.status(201).json(comment);
}));

// Update comment
router.put('/comments/:id', asyncHandler(async (req, res) => {
  const { comment_text } = req.body;

  const comment = await TaskComment.findByIdAndUpdate(
    req.params.id,
    { comment_text },
    { new: true }
  );

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  res.json(comment);
}));

// Delete comment
router.delete('/comments/:id', asyncHandler(async (req, res) => {
  const comment = await TaskComment.findByIdAndDelete(req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  res.json({ message: 'Comment deleted successfully' });
}));

// ============================================
// KANBAN VIEW
// ============================================

router.get('/:projectId/tasks/kanban', asyncHandler(async (req, res) => {
  const { milestone_id } = req.query;
  const match: any = { project_id: req.params.projectId };
  if (milestone_id) match.milestone_id = milestone_id;

  const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };

  const result = await ProjectTask.aggregate([
    { $match: match },
    {
      $addFields: {
        priority_order: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'critical'] }, then: 1 },
              { case: { $eq: ['$priority', 'high'] }, then: 2 },
              { case: { $eq: ['$priority', 'medium'] }, then: 3 },
              { case: { $eq: ['$priority', 'low'] }, then: 4 },
            ],
            default: 5,
          },
        },
      },
    },
    { $sort: { priority_order: 1, due_date: 1 } },
    {
      $group: {
        _id: '$status',
        tasks: {
          $push: {
            id: '$_id',
            name: '$name',
            description: '$description',
            priority: '$priority',
            assignee_id: '$assignee_id',
            due_date: '$due_date',
            estimated_hours: '$estimated_hours',
            actual_hours: '$actual_hours',
            story_points: '$story_points',
          },
        },
      },
    },
    { $project: { status: '$_id', tasks: 1, _id: 0 } },
  ]);

  res.json(result);
}));

export default router;

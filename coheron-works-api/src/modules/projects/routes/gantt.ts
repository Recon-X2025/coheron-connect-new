import express from 'express';
import ProjectTask from '../../../models/ProjectTask.js';
import ProjectMilestone from '../../../models/ProjectMilestone.js';
import TaskDependency from '../../../models/TaskDependency.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

const statusColorMap: Record<string, string> = {
  backlog: '#9e9e9e', todo: '#2196f3', in_progress: '#ff9800',
  in_review: '#9c27b0', done: '#4caf50', cancelled: '#f44336',
};

router.get('/', asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id query param is required' });

  const tasks = await ProjectTask.find({ project_id })
    .populate('assignee_id', 'name').sort({ planned_start_date: 1 }).lean();
  const milestones = await ProjectMilestone.find({ project_id }).lean();
  const taskIds = tasks.map((t: any) => t._id);
  const dependencies = await TaskDependency.find({ task_id: { $in: taskIds } }).lean();

  const ganttTasks = tasks.map((t: any) => {
    const progress = t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : t.status === 'in_review' ? 80 : 0;
    return {
      id: t._id, name: t.name,
      start_date: t.planned_start_date || t.created_at,
      end_date: t.planned_end_date || t.due_date || t.planned_start_date || t.created_at,
      progress,
      dependencies: dependencies.filter((d: any) => String(d.task_id) === String(t._id)).map((d: any) => d.depends_on_task_id),
      assignee_name: (t.assignee_id as any)?.name || null,
      milestone: false, color: statusColorMap[t.status] || '#9e9e9e',
      parent_task_id: t.parent_task_id || null,
    };
  });

  const milestoneItems = milestones.map((m: any) => ({
    id: m._id, name: m.name,
    start_date: m.planned_start_date || m.planned_end_date,
    end_date: m.planned_end_date || m.planned_start_date,
    progress: m.status === 'completed' ? 100 : 0,
    dependencies: [], assignee_name: null, milestone: true, color: '#e91e63', parent_task_id: null,
  }));

  const links = dependencies.map((d: any, idx: number) => ({
    id: d._id || idx, source: d.depends_on_task_id, target: d.task_id, type: 'finish_to_start',
  }));

  res.json({ tasks: [...ganttTasks, ...milestoneItems], links });
}));

router.get('/resource-load', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const dateFilter: any = {};
  if (start_date) dateFilter.$gte = new Date(start_date as string);
  if (end_date) dateFilter.$lte = new Date(end_date as string);
  const matchStage: any = { assignee_id: { $ne: null }, status: { $nin: ['done', 'cancelled'] } };
  if (Object.keys(dateFilter).length > 0) matchStage.planned_start_date = dateFilter;
  const resources = await ProjectTask.aggregate([
    { $match: matchStage },
    { $lookup: { from: 'users', localField: 'assignee_id', foreignField: '_id', as: 'assignee' } },
    { $unwind: '$assignee' },
    { $lookup: { from: 'projects', localField: 'project_id', foreignField: '_id', as: 'project' } },
    { $unwind: '$project' },
    { $group: {
      _id: '$assignee_id',
      name: { $first: '$assignee.name' },
      email: { $first: '$assignee.email' },
      tasks: { $push: {
        task_id: '$_id', task_name: '$name', project_id: '$project_id',
        project_name: '$project.name', start_date: '$planned_start_date',
        end_date: '$planned_end_date', estimated_hours: '$estimated_hours',
        status: '$status', priority: '$priority',
      } },
      total_estimated_hours: { $sum: { $ifNull: ['$estimated_hours', 0] } },
      task_count: { $sum: 1 },
    } },
    { $sort: { total_estimated_hours: -1 } },
  ]);

  const result = resources.map((r: any) => {
    const dayLoadMap: Record<string, number> = {};
    for (const task of r.tasks) {
      if (!task.start_date || !task.end_date) continue;
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const hoursPerDay = (task.estimated_hours || 8) / days;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        dayLoadMap[key] = (dayLoadMap[key] || 0) + hoursPerDay;
      }
    }
    const overloaded_days = Object.entries(dayLoadMap)
      .filter(([, hours]) => hours > 8)
      .map(([date, hours]) => ({ date, hours: Math.round(hours * 100) / 100 }));
    return { ...r, overloaded_days, is_overloaded: overloaded_days.length > 0 };
  });
  res.json(result);
}));

// ── D14: Drag-Drop Gantt Endpoints ──────────────────────────────────

router.get('/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const tasks = await ProjectTask.find({ project_id: projectId })
    .populate('assignee_id', 'name').sort({ planned_start_date: 1 }).lean();
  const milestones = await ProjectMilestone.find({ project_id: projectId }).lean();
  const taskIds = tasks.map((t: any) => t._id);
  const dependencies = await TaskDependency.find({ task_id: { $in: taskIds } }).lean();

  const ganttTasks = tasks.map((t: any) => {
    const progress = t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : t.status === 'in_review' ? 80 : 0;
    return {
      id: t._id, name: t.name,
      start: t.planned_start_date || t.created_at,
      end: t.planned_end_date || t.due_date || t.planned_start_date || t.created_at,
      progress,
      dependencies: dependencies.filter((d: any) => String(d.task_id) === String(t._id)).map((d: any) => String(d.depends_on_task_id)),
      parent: t.parent_task_id || null,
      assignee_name: (t.assignee_id as any)?.name || null,
      milestone: false,
      color: statusColorMap[t.status] || '#9e9e9e',
      status: t.status,
    };
  });

  const milestoneItems = milestones.map((m: any) => ({
    id: m._id, name: m.name,
    start: m.planned_start_date || m.planned_end_date,
    end: m.planned_end_date || m.planned_start_date,
    progress: m.status === 'completed' ? 100 : 0,
    dependencies: [], parent: null, assignee_name: null, milestone: true, color: '#e91e63', status: m.status,
  }));

  const links = dependencies.map((d: any, idx: number) => ({
    id: d._id || idx, source: String(d.depends_on_task_id), target: String(d.task_id), type: d.dependency_type || 'finish_to_start',
  }));

  res.json({ tasks: [...ganttTasks, ...milestoneItems], links });
}));

// Update task dates/progress from drag
router.put('/:projectId/tasks/:taskId', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { start, end, progress } = req.body;
  const update: any = {};
  if (start !== undefined) update.planned_start_date = new Date(start);
  if (end !== undefined) {
    update.planned_end_date = new Date(end);
    update.due_date = new Date(end);
  }
  if (progress !== undefined) {
    if (progress >= 100) update.status = 'done';
    else if (progress > 0) update.status = 'in_progress';
  }
  const task = await ProjectTask.findByIdAndUpdate(taskId, { $set: update }, { new: true }).lean();
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}));

// Update task dependencies
router.put('/:projectId/tasks/:taskId/dependencies', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { dependencies } = req.body; // array of depends_on_task_id strings
  // Remove existing dependencies for this task
  await TaskDependency.deleteMany({ task_id: taskId });
  // Create new ones
  const docs = (dependencies || []).map((depId: string) => ({
    task_id: taskId,
    depends_on_task_id: depId,
    dependency_type: 'finish_to_start',
  }));
  if (docs.length > 0) await TaskDependency.insertMany(docs);
  const updated = await TaskDependency.find({ task_id: taskId }).lean();
  res.json(updated);
}));

// Link/unlink a single dependency
router.post('/:projectId/tasks/:taskId/link', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { target_task_id, action = 'link', dependency_type = 'finish_to_start' } = req.body;
  if (!target_task_id) return res.status(400).json({ error: 'target_task_id is required' });

  if (action === 'unlink') {
    await TaskDependency.deleteOne({ task_id: taskId, depends_on_task_id: target_task_id });
    return res.json({ message: 'Dependency removed' });
  }
  // Check for duplicate
  const existing = await TaskDependency.findOne({ task_id: taskId, depends_on_task_id: target_task_id });
  if (existing) return res.json(existing);
  const dep = await TaskDependency.create({ task_id: taskId, depends_on_task_id: target_task_id, dependency_type });
  res.status(201).json(dep);
}));

export default router;

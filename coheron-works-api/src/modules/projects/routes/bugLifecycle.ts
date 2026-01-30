import express from 'express';
import Issue from '../../../models/Issue.js';
import IssueType from '../../../models/IssueType.js';
import IssueComment from '../../../models/IssueComment.js';
import IssueAttachment from '../../../models/IssueAttachment.js';
import IssueHistory from '../../../models/IssueHistory.js';
import Backlog from '../../../models/Backlog.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// BUG/DEFECT LIFECYCLE MANAGEMENT
// ============================================

// Get Bugs for a Project
router.get('/projects/:projectId/bugs', asyncHandler(async (req, res) => {
  const { status, severity, assignee_id, release_version } = req.query;

  // Get Bug issue type
  const bugType = await IssueType.findOne({ name: 'Bug', is_active: true }).lean();
  if (!bugType) {
    return res.json({ bugs: [], grouped_by_severity: {}, total_count: 0, open_count: 0, resolved_count: 0 });
  }

  const filter: any = { project_id: req.params.projectId, issue_type_id: bugType._id };
  if (status) filter.status = status;
  if (assignee_id) filter.assignee_id = assignee_id;
  if (release_version) filter.fix_version = release_version;

  const bugs = await Issue.find(filter)
    .populate('issue_type_id', 'name')
    .populate('assignee_id', 'name')
    .populate('reporter_id', 'name')
    .sort({ created_at: -1 })
    .lean();

  const result = bugs.map((b: any) => ({
    ...b,
    issue_type_name: b.issue_type_id?.name,
    assignee_name: b.assignee_id?.name,
    reporter_name: b.reporter_id?.name,
  }));

  const groupedBySeverity = result.reduce((acc: any, bug: any) => {
    const sev = bug.labels?.find((l: string) => l.startsWith('severity:')) || 'unknown';
    if (!acc[sev]) acc[sev] = [];
    acc[sev].push(bug);
    return acc;
  }, {});

  res.json({
    bugs: result,
    grouped_by_severity: groupedBySeverity,
    total_count: result.length,
    open_count: result.filter((b: any) => b.status !== 'Done').length,
    resolved_count: result.filter((b: any) => b.status === 'Done').length,
  });
}));

// Get Bug by ID with Full Lifecycle
router.get('/bugs/:id', asyncHandler(async (req, res) => {
  const bugType = await IssueType.findOne({ name: 'Bug' }).lean();
  const bug = await Issue.findOne({ _id: req.params.id, issue_type_id: bugType?._id })
    .populate('issue_type_id', 'name')
    .populate('assignee_id', 'name')
    .populate('reporter_id', 'name')
    .lean();

  if (!bug) {
    return res.status(404).json({ error: 'Bug not found' });
  }

  const bugObj: any = {
    ...bug,
    issue_type_name: (bug as any).issue_type_id?.name,
    assignee_name: (bug as any).assignee_id?.name,
    reporter_name: (bug as any).reporter_id?.name,
  };

  const [history, comments, attachments] = await Promise.all([
    IssueHistory.find({ issue_id: req.params.id }).sort({ created_at: -1 }).lean(),
    IssueComment.find({ issue_id: req.params.id }).populate('user_id', 'name').sort({ created_at: 1 }).lean(),
    IssueAttachment.find({ issue_id: req.params.id }).sort({ created_at: 1 }).lean(),
  ]);

  // Related issues (simple text search)
  const searchTerm = bugObj.summary?.substring(0, 20) || '';
  const relatedIssues = searchTerm
    ? await Issue.find({
        project_id: bugObj.project_id,
        _id: { $ne: req.params.id },
        $or: [
          { summary: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
        .populate('issue_type_id', 'name')
        .limit(5)
        .lean()
    : [];

  const commentsResult = comments.map((c: any) => ({
    ...c,
    user_name: c.user_id?.name,
  }));

  res.json({
    ...bugObj,
    history,
    comments: commentsResult,
    attachments,
    related_issues: relatedIssues.map((ri: any) => ({
      ...ri,
      issue_type_name: ri.issue_type_id?.name,
    })),
  });
}));

// Create Bug
router.post('/projects/:projectId/bugs', asyncHandler(async (req, res) => {
  const {
    summary, description, priority, assignee_id, reporter_id,
    labels, components, fix_version, due_date, story_points, time_estimate,
  } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'Summary is required' });
  }

  const bugType = await IssueType.findOne({ name: 'Bug', is_active: true }).lean();
  if (!bugType) {
    return res.status(400).json({ error: 'Bug issue type not found. Please create it first.' });
  }

  // Get project key
  const Project = mongoose.model('Project');
  const project = await Project.findById(req.params.projectId).lean();
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get next issue number
  const maxIssue = await Issue.findOne({ project_id: req.params.projectId })
    .sort({ created_at: -1 })
    .lean();
  const lastNum = maxIssue?.key ? parseInt(maxIssue.key.split('-').pop() || '0') : 0;
  const issueKey = `${(project as any).key}-${lastNum + 1}`;

  const bug = await Issue.create({
    project_id: req.params.projectId,
    issue_type_id: bugType._id,
    key: issueKey,
    summary,
    description,
    priority: priority || 'medium',
    assignee_id,
    reporter_id,
    labels: labels || [],
    components: components || [],
    fix_version,
    due_date,
    story_points,
    time_estimate,
    status: 'To Do',
  });

  // Add to backlog
  await Backlog.findOneAndUpdate(
    { project_id: req.params.projectId, issue_id: bug._id },
    { project_id: req.params.projectId, issue_id: bug._id, priority: 0 },
    { upsert: true }
  );

  // Create history entry
  await IssueHistory.create({
    issue_id: bug._id,
    field_name: 'status',
    new_value: 'To Do',
    changed_by: reporter_id,
  });

  res.status(201).json(bug);
}));

// Update Bug Status (with lifecycle tracking)
router.put('/bugs/:id/status', asyncHandler(async (req, res) => {
  const { status, resolution, resolved_by } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const bugType = await IssueType.findOne({ name: 'Bug' }).lean();
  const bug = await Issue.findOne({ _id: req.params.id, issue_type_id: bugType?._id });

  if (!bug) {
    return res.status(404).json({ error: 'Bug not found' });
  }

  const currentStatus = bug.status;
  const updateData: any = { status };
  if (resolution) updateData.resolution = resolution;
  if (status === 'Done' && !bug.resolution) {
    updateData.resolved_at = new Date();
  }

  const updated = await Issue.findByIdAndUpdate(req.params.id, updateData, { new: true });

  // Create history entry
  await IssueHistory.create({
    issue_id: req.params.id,
    field_name: 'status',
    old_value: currentStatus,
    new_value: status,
    changed_by: resolved_by,
  });

  res.json(updated);
}));

// Get Bug Statistics
router.get('/projects/:projectId/bugs/statistics', asyncHandler(async (req, res) => {
  const bugType = await IssueType.findOne({ name: 'Bug' }).lean();
  if (!bugType) {
    return res.json({ summary: {}, by_status: [], by_priority: [] });
  }

  const matchFilter = { project_id: new mongoose.Types.ObjectId(req.params.projectId), issue_type_id: bugType._id };

  const [summary, byStatus, byPriority] = await Promise.all([
    Issue.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total_bugs: { $sum: 1 },
          open_bugs: { $sum: { $cond: [{ $ne: ['$status', 'Done'] }, 1, 0] } },
          resolved_bugs: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
          critical_bugs: { $sum: { $cond: [{ $in: ['$priority', ['highest', 'high']] }, 1, 0] } },
          avg_resolution_days: {
            $avg: {
              $cond: [
                { $ne: ['$resolved_at', null] },
                { $divide: [{ $subtract: ['$resolved_at', '$created_at'] }, 86400000] },
                null,
              ],
            },
          },
        },
      },
    ]),
    Issue.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]),
    Issue.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $project: { priority: '$_id', count: 1, _id: 0 } },
    ]),
  ]);

  res.json({
    summary: summary[0] || {},
    by_status: byStatus,
    by_priority: byPriority,
  });
}));

export default router;

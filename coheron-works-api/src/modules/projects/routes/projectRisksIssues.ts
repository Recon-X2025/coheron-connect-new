import express from 'express';
import mongoose from 'mongoose';
import Project from '../../../models/Project.js';
import ProjectRisk from '../../../models/ProjectRisk.js';
import ProjectIssue from '../../../models/ProjectIssue.js';
import ChangeRequest from '../../../models/ChangeRequest.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// RISK REGISTER
// ============================================

// Get project risks
router.get('/:projectId/risks', asyncHandler(async (req, res) => {
  const { status, category, min_risk_score } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (min_risk_score) filter.risk_score = { $gte: Number(min_risk_score) };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ProjectRisk.find(filter)
      .populate('owner_id', 'name')
      .sort({ risk_score: -1, created_at: -1 })
      .lean(),
    pagination, filter, ProjectRisk
  );

  const data = paginatedResult.data.map((r: any) => {
    const obj: any = { ...r };
    if (obj.owner_id) obj.owner_name = obj.owner_id.name;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get risk by ID
router.get('/risks/:id', asyncHandler(async (req, res) => {
  const risk = await ProjectRisk.findById(req.params.id)
    .populate('owner_id', 'name email')
    .lean();

  if (!risk) {
    return res.status(404).json({ error: 'Risk not found' });
  }

  const obj: any = { ...risk };
  if (obj.owner_id) {
    obj.owner_name = obj.owner_id.name;
    obj.owner_email = obj.owner_id.email;
  }

  res.json(obj);
}));

// Create risk
router.post('/:projectId/risks', asyncHandler(async (req, res) => {
  const { title, description, category, probability, impact, status, mitigation_plan, mitigation_owner } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Risk title is required' });
  }

  const prob = probability || 3;
  const imp = impact || 3;

  const risk = await ProjectRisk.create({
    project_id: req.params.projectId,
    title, description, category,
    probability: prob,
    impact: imp,
    risk_score: prob * imp,
    status: status || 'identified',
    mitigation_plan,
    mitigation_owner: mitigation_owner || req.body.owner_id,
  });

  res.status(201).json(risk);
}));

// Update risk
router.put('/risks/:id', asyncHandler(async (req, res) => {
  const { title, description, category, probability, impact, status, mitigation_plan, residual_risk_score, mitigation_owner } = req.body;

  const fields: Record<string, any> = {
    title, description, category, probability, impact,
    status, mitigation_plan, residual_risk_score, mitigation_owner,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  // Recalculate risk_score if probability or impact changed
  if (probability !== undefined || impact !== undefined) {
    const existing = await ProjectRisk.findById(req.params.id).lean();
    if (existing) {
      const p = probability !== undefined ? probability : existing.probability;
      const i = impact !== undefined ? impact : existing.impact;
      updateData.risk_score = p * i;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const risk = await ProjectRisk.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!risk) {
    return res.status(404).json({ error: 'Risk not found' });
  }

  res.json(risk);
}));

// Delete risk
router.delete('/risks/:id', asyncHandler(async (req, res) => {
  const risk = await ProjectRisk.findByIdAndDelete(req.params.id);

  if (!risk) {
    return res.status(404).json({ error: 'Risk not found' });
  }

  res.json({ message: 'Risk deleted successfully' });
}));

// Get risk heat map data
router.get('/:projectId/risks/heatmap', asyncHandler(async (req, res) => {
  const result = await ProjectRisk.aggregate([
    { $match: { project_id: new mongoose.Types.ObjectId(req.params.projectId) } },
    {
      $group: {
        _id: { probability: '$probability', impact: '$impact' },
        risk_count: { $sum: 1 },
        risks: {
          $push: {
            id: '$_id',
            title: '$title',
            status: '$status',
            category: '$category',
          },
        },
      },
    },
    {
      $project: {
        probability: '$_id.probability',
        impact: '$_id.impact',
        risk_count: 1,
        risks: 1,
        _id: 0,
      },
    },
    { $sort: { probability: -1, impact: -1 } },
  ]);

  res.json(result);
}));

// ============================================
// ISSUE TRACKING
// ============================================

// Get project issues
router.get('/:projectId/issues', asyncHandler(async (req, res) => {
  const { status, severity, priority, assigned_to } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (priority) filter.priority = priority;
  if (assigned_to) filter.assigned_to = assigned_to;

  const severityOrder: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
  const priorityOrder: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };

  const issues = await ProjectIssue.find(filter)
    .populate('reported_by', 'name')
    .populate('assigned_to', 'name')
    .populate('task_id', 'name')
    .sort({ created_at: -1 })
    .lean();

  const rows = issues.map((i: any) => {
    const obj: any = { ...i };
    if (obj.reported_by) obj.reported_by_name = obj.reported_by.name;
    if (obj.assigned_to) obj.assigned_to_name = obj.assigned_to.name;
    if (obj.task_id) obj.task_name = obj.task_id.name;
    return obj;
  });

  // Sort by severity then priority
  rows.sort((a, b) => {
    const sevA = severityOrder[a.severity] || 5;
    const sevB = severityOrder[b.severity] || 5;
    if (sevA !== sevB) return sevA - sevB;
    const priA = priorityOrder[a.priority] || 5;
    const priB = priorityOrder[b.priority] || 5;
    return priA - priB;
  });

  res.json(rows);
}));

// Get issue by ID
router.get('/issues/:id', asyncHandler(async (req, res) => {
  const issue = await ProjectIssue.findById(req.params.id)
    .populate('reported_by', 'name email')
    .populate('assigned_to', 'name email')
    .populate('task_id', 'name')
    .lean();

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const obj: any = { ...issue };
  if (obj.reported_by) {
    obj.reported_by_name = obj.reported_by.name;
    obj.reported_by_email = obj.reported_by.email;
  }
  if (obj.assigned_to) {
    obj.assigned_to_name = obj.assigned_to.name;
    obj.assigned_to_email = obj.assigned_to.email;
  }
  if (obj.task_id) obj.task_name = obj.task_id.name;

  res.json(obj);
}));

// Create issue
router.post('/:projectId/issues', asyncHandler(async (req, res) => {
  const {
    task_id, title, description, severity, priority,
    status, reported_by, assigned_to, sla_deadline,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Issue title is required' });
  }

  const issue = await ProjectIssue.create({
    project_id: req.params.projectId,
    task_id: task_id || null,
    title,
    description: description || null,
    severity: severity || 'medium',
    priority: priority || 'medium',
    status: status || 'open',
    reported_by: reported_by || null,
    assigned_to: assigned_to || null,
    sla_deadline: sla_deadline || null,
  });

  res.status(201).json(issue);
}));

// Update issue
router.put('/issues/:id', asyncHandler(async (req, res) => {
  const {
    task_id, title, description, severity, priority,
    status, assigned_to, sla_deadline, resolution, root_cause,
  } = req.body;

  const fields: Record<string, any> = {
    task_id, title, description, severity, priority,
    status, assigned_to, sla_deadline, resolution, root_cause,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (status === 'resolved' && !req.body.resolved_at) {
    updateData.resolved_at = new Date();
    if (assigned_to) {
      updateData.resolved_by = assigned_to;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const issue = await ProjectIssue.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  res.json(issue);
}));

// Delete issue
router.delete('/issues/:id', asyncHandler(async (req, res) => {
  const issue = await ProjectIssue.findByIdAndDelete(req.params.id);

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  res.json({ message: 'Issue deleted successfully' });
}));

// ============================================
// CHANGE REQUESTS
// ============================================

// Get project change requests
router.get('/:projectId/change-requests', asyncHandler(async (req, res) => {
  const { status, change_type } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;
  if (change_type) filter.change_type = change_type;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ChangeRequest.find(filter)
      .populate('requested_by', 'name')
      .populate('approved_by', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, ChangeRequest
  );

  const data = paginatedResult.data.map((cr: any) => {
    const obj: any = { ...cr };
    if (obj.requested_by) obj.requested_by_name = obj.requested_by.name;
    if (obj.approved_by) obj.approved_by_name = obj.approved_by.name;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get change request by ID
router.get('/change-requests/:id', asyncHandler(async (req, res) => {
  const cr = await ChangeRequest.findById(req.params.id)
    .populate('requested_by', 'name email')
    .populate('approved_by', 'name email')
    .lean();

  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }

  const obj: any = { ...cr };
  if (obj.requested_by) {
    obj.requested_by_name = obj.requested_by.name;
    obj.requested_by_email = obj.requested_by.email;
  }
  if (obj.approved_by) {
    obj.approved_by_name = obj.approved_by.name;
    obj.approved_by_email = obj.approved_by.email;
  }

  res.json(obj);
}));

// Create change request
router.post('/:projectId/change-requests', asyncHandler(async (req, res) => {
  const {
    change_number, change_type, title, description, reason,
    scope_impact, cost_impact, schedule_impact_days,
    original_contract_value, revised_contract_value, requested_by,
  } = req.body;

  if (!change_type || !title) {
    return res.status(400).json({ error: 'Change type and title are required' });
  }

  let finalChangeNumber = change_number;
  if (!finalChangeNumber) {
    const project = await Project.findById(req.params.projectId).lean();
    const projectCode = (project as any)?.code || 'PROJ';
    const count = await ChangeRequest.countDocuments({ project_id: req.params.projectId });
    const num = count + 1;
    finalChangeNumber = `${projectCode}-CR-${num.toString().padStart(4, '0')}`;
  }

  const cr = await ChangeRequest.create({
    project_id: req.params.projectId,
    change_code: finalChangeNumber,
    change_type, title,
    description: description || reason,
    scope_impact,
    cost_impact: cost_impact || 0,
    timeline_impact_days: schedule_impact_days || req.body.timeline_impact_days || 0,
    original_contract_value, revised_contract_value,
    requested_by,
    status: 'draft',
  });

  res.status(201).json(cr);
}));

// Update change request
router.put('/change-requests/:id', asyncHandler(async (req, res) => {
  const {
    change_type, title, description, reason, scope_impact,
    cost_impact, schedule_impact_days, original_contract_value,
    revised_contract_value, status, approved_by,
  } = req.body;

  const fields: Record<string, any> = {
    change_type, title, description, reason, scope_impact,
    cost_impact, schedule_impact_days, original_contract_value,
    revised_contract_value, status, approved_by,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (status === 'approved' && approved_by) {
    updateData.approved_at = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const cr = await ChangeRequest.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }

  res.json(cr);
}));

// Delete change request
router.delete('/change-requests/:id', asyncHandler(async (req, res) => {
  const cr = await ChangeRequest.findByIdAndDelete(req.params.id);

  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }

  res.json({ message: 'Change request deleted successfully' });
}));

export default router;

import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';
import Project from '../models/Project.js';
import ProjectStakeholder from '../models/ProjectStakeholder.js';
import ProjectApproval from '../models/ProjectApproval.js';
import ProjectBudget from '../models/ProjectBudget.js';
import ProjectCost from '../models/ProjectCost.js';
import ProjectTask from '../models/ProjectTask.js';
import Timesheet from '../models/Timesheet.js';
import ProjectRisk from '../models/ProjectRisk.js';
import ProjectIssue from '../models/ProjectIssue.js';
import ProjectMilestone from '../models/ProjectMilestone.js';

const router = express.Router();

// ============================================
// PROJECT MASTER DATA - CRUD Operations
// ============================================

// Get all projects
router.get('/', asyncHandler(async (req, res) => {
  const filter: any = {};
  const params = getPaginationParams(req);
  const result = await paginateQuery(Project.find(filter).sort({ created_at: -1 }).lean(), params, filter, Project);
  res.json(result);
}));

// Get project by ID with full details
router.get('/:id', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).lean();

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get stakeholders
  const stakeholders = await ProjectStakeholder.find({ project_id: project._id })
    .populate('user_id', 'name email')
    .lean();

  const stakeholderRows = stakeholders.map(s => {
    const obj: any = s;
    if (obj.user_id) {
      obj.user_name = obj.user_id.name;
      obj.user_email = obj.user_id.email;
    }
    return obj;
  });

  // Get budget summary
  const budgetAgg = await ProjectBudget.aggregate([
    { $match: { project_id: project._id } },
    {
      $group: {
        _id: null,
        total_revenue: { $sum: { $cond: [{ $eq: ['$budget_type', 'revenue'] }, '$planned_amount', 0] } },
        total_capex: { $sum: { $cond: [{ $eq: ['$budget_type', 'capex'] }, '$planned_amount', 0] } },
        total_opex: { $sum: { $cond: [{ $eq: ['$budget_type', 'opex'] }, '$planned_amount', 0] } },
        total_committed: { $sum: '$committed_amount' },
        total_actual: { $sum: '$actual_amount' },
      },
    },
  ]);

  // Get cost summary
  const costAgg = await ProjectCost.aggregate([
    { $match: { project_id: project._id } },
    {
      $group: {
        _id: null,
        total_cost: { $sum: '$amount' },
        cost_count: { $sum: 1 },
      },
    },
  ]);

  // Get task summary
  const taskAgg = await ProjectTask.aggregate([
    { $match: { project_id: project._id } },
    {
      $group: {
        _id: null,
        total_tasks: { $sum: 1 },
        completed_tasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        total_estimated_hours: { $sum: '$estimated_hours' },
        total_actual_hours: { $sum: '$actual_hours' },
      },
    },
  ]);

  res.json({
    ...project,
    stakeholders: stakeholderRows,
    budget_summary: budgetAgg[0] || {},
    cost_summary: costAgg[0] || {},
    task_summary: taskAgg[0] || {},
  });
}));

// Create project
router.post('/', asyncHandler(async (req, res) => {
  const {
    code,
    key,
    name,
    description,
    project_type,
    industry_sector,
    contract_type,
    billing_type,
    start_date,
    end_date,
    project_manager_id,
    lead_id,
    partner_id,
    parent_program_id,
    state,
    status,
    avatar_url,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  let projectCode = code || key;
  let projectKey = key || code;

  if (!projectCode) {
    projectCode = name.substring(0, 8).toUpperCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
  }

  if (!projectKey) {
    projectKey = projectCode;
  }

  // Check if code/key already exists
  const existing = await Project.findOne({ $or: [{ code: projectCode }, { key: projectCode }] }).lean();

  if (existing) {
    return res.status(400).json({ error: 'Project code/key already exists' });
  }

  const projectData: any = {
    key: projectKey,
    code: projectCode,
    name,
  };

  const optionalFields: Record<string, any> = {
    description,
    project_type: project_type || 'client',
    industry_sector,
    contract_type: contract_type || 'fixed_bid',
    billing_type: billing_type || 'milestone',
    start_date,
    end_date,
    project_manager_id: project_manager_id || lead_id,
    partner_id,
    parent_program_id,
    state: state || status || 'draft',
    avatar_url,
  };

  Object.entries(optionalFields).forEach(([field, value]) => {
    if (value !== undefined && value !== null) {
      projectData[field] = value;
    }
  });

  const project = await Project.create(projectData);
  res.status(201).json(project);
}));

// Update project
router.put('/:id', asyncHandler(async (req, res) => {
  const {
    code,
    key,
    name,
    description,
    project_type,
    industry_sector,
    contract_type,
    billing_type,
    start_date,
    end_date,
    project_manager_id,
    lead_id,
    partner_id,
    parent_program_id,
    state,
    status,
    avatar_url,
  } = req.body;

  // If code/key is being changed, check if new value exists
  if (code || key) {
    const checkValue = code || key;
    const existing = await Project.findOne({
      $or: [{ code: checkValue }, { key: checkValue }],
      _id: { $ne: req.params.id },
    }).lean();

    if (existing) {
      return res.status(400).json({ error: 'Project code/key already exists' });
    }
  }

  const fields: Record<string, any> = {
    code,
    key,
    name,
    description,
    project_type,
    industry_sector,
    contract_type,
    billing_type,
    start_date,
    end_date,
    project_manager_id: project_manager_id || lead_id,
    partner_id,
    parent_program_id,
    state: state || status,
    avatar_url,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([k, value]) => {
    if (value !== undefined && value !== null) {
      updateData[k] = value;
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const project = await Project.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json(project);
}));

// Delete project
router.delete('/:id', asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id).lean();

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ message: 'Project deleted successfully' });
}));

// ============================================
// PROJECT STAKEHOLDERS
// ============================================

// Get project stakeholders
router.get('/:id/stakeholders', asyncHandler(async (req, res) => {
  const stakeholders = await ProjectStakeholder.find({ project_id: req.params.id })
    .populate('user_id', 'name email')
    .sort({ created_at: 1 })
    .lean();

  const rows = stakeholders.map(s => {
    const obj: any = s;
    if (obj.user_id) {
      obj.user_name = obj.user_id.name;
      obj.user_email = obj.user_id.email;
    }
    return obj;
  });

  res.json(rows);
}));

// Add stakeholder
router.post('/:id/stakeholders', asyncHandler(async (req, res) => {
  const { user_id, role } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const existing = await ProjectStakeholder.findOne({ project_id: req.params.id, user_id }).lean();

  if (existing) {
    return res.status(400).json({ error: 'Stakeholder already exists' });
  }

  const stakeholder = await ProjectStakeholder.create({
    project_id: req.params.id,
    user_id,
    role,
  });

  res.status(201).json(stakeholder);
}));

// Remove stakeholder
router.delete('/:id/stakeholders/:stakeholderId', asyncHandler(async (req, res) => {
  const result = await ProjectStakeholder.findOneAndDelete({
    _id: req.params.stakeholderId,
    project_id: req.params.id,
  }).lean();

  if (!result) {
    return res.status(404).json({ error: 'Stakeholder not found' });
  }

  res.json({ message: 'Stakeholder removed successfully' });
}));

// ============================================
// PROJECT APPROVALS
// ============================================

// Get project approvals
router.get('/:id/approvals', asyncHandler(async (req, res) => {
  const approvals = await ProjectApproval.find({ project_id: req.params.id })
    .populate('approver_id', 'name')
    .sort({ created_at: -1 })
    .lean();

  const rows = approvals.map(a => {
    const obj: any = a;
    if (obj.approver_id) {
      obj.approver_name = obj.approver_id.name;
    }
    return obj;
  });

  res.json(rows);
}));

// Create approval request
router.post('/:id/approvals', asyncHandler(async (req, res) => {
  const { approval_type, approver_id, comments } = req.body;

  if (!approval_type || !approver_id) {
    return res.status(400).json({ error: 'Approval type and approver ID are required' });
  }

  const approval = await ProjectApproval.create({
    project_id: req.params.id,
    approval_type,
    approver_id,
    comments,
    status: 'pending',
  });

  res.status(201).json(approval);
}));

// Update approval status
router.put('/:id/approvals/:approvalId', asyncHandler(async (req, res) => {
  const { status, comments } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
  }

  const updateData: any = { status };
  if (comments) {
    updateData.comments = comments;
  }
  if (status === 'approved') {
    updateData.approved_at = new Date();
  }

  const approval = await ProjectApproval.findOneAndUpdate(
    { _id: req.params.approvalId, project_id: req.params.id },
    updateData,
    { new: true }
  ).lean();

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  res.json(approval);
}));

// ============================================
// PROJECT DASHBOARD / KPI SUMMARY
// ============================================

router.get('/:id/dashboard', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).lean();

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const projectId = project._id;

  // Get budget vs actuals
  const budgetAgg = await ProjectBudget.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        planned_revenue: { $sum: { $cond: [{ $eq: ['$budget_type', 'revenue'] }, '$planned_amount', 0] } },
        actual_revenue: { $sum: { $cond: [{ $eq: ['$budget_type', 'revenue'] }, '$actual_amount', 0] } },
        planned_capex: { $sum: { $cond: [{ $eq: ['$budget_type', 'capex'] }, '$planned_amount', 0] } },
        actual_capex: { $sum: { $cond: [{ $eq: ['$budget_type', 'capex'] }, '$actual_amount', 0] } },
        planned_opex: { $sum: { $cond: [{ $eq: ['$budget_type', 'opex'] }, '$planned_amount', 0] } },
        actual_opex: { $sum: { $cond: [{ $eq: ['$budget_type', 'opex'] }, '$actual_amount', 0] } },
      },
    },
  ]);

  // Get task statistics
  const taskAgg = await ProjectTask.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_tasks: { $sum: 1 },
        completed_tasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        in_progress_tasks: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        backlog_tasks: { $sum: { $cond: [{ $eq: ['$status', 'backlog'] }, 1, 0] } },
        total_estimated_hours: { $sum: '$estimated_hours' },
        total_actual_hours: { $sum: '$actual_hours' },
      },
    },
  ]);

  // Get timesheet summary
  const timesheetAgg = await Timesheet.aggregate([
    { $match: { project_id: projectId, approval_status: 'approved' } },
    {
      $group: {
        _id: null,
        total_hours: { $sum: '$hours_worked' },
        billable_hours: { $sum: { $cond: ['$is_billable', '$hours_worked', 0] } },
        active_resources: { $addToSet: '$user_id' },
      },
    },
    {
      $project: {
        total_hours: 1,
        billable_hours: 1,
        active_resources: { $size: '$active_resources' },
      },
    },
  ]);

  // Get risk summary
  const riskAgg = await ProjectRisk.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_risks: { $sum: 1 },
        identified_risks: { $sum: { $cond: [{ $eq: ['$status', 'identified'] }, 1, 0] } },
        high_risk_count: { $sum: { $cond: [{ $gte: ['$risk_score', 15] }, 1, 0] } },
        avg_risk_score: { $avg: '$risk_score' },
      },
    },
  ]);

  // Get issue summary
  const issueAgg = await ProjectIssue.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_issues: { $sum: 1 },
        open_issues: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        critical_issues: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
      },
    },
  ]);

  // Get milestone progress
  const milestoneAgg = await ProjectMilestone.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_milestones: { $sum: 1 },
        completed_milestones: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        delayed_milestones: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } },
      },
    },
  ]);

  res.json({
    project,
    budget: budgetAgg[0] || {},
    tasks: taskAgg[0] || {},
    timesheets: timesheetAgg[0] || {},
    risks: riskAgg[0] || {},
    issues: issueAgg[0] || {},
    milestones: milestoneAgg[0] || {},
  });
}));

export default router;

import express from 'express';
import mongoose from 'mongoose';
import Project from '../../../models/Project.js';
import ProjectBudget from '../../../models/ProjectBudget.js';
import ProjectCost from '../../../models/ProjectCost.js';
import ProjectTask from '../../../models/ProjectTask.js';
import Timesheet from '../../../models/Timesheet.js';
import ProjectRisk from '../../../models/ProjectRisk.js';
import ProjectIssue from '../../../models/ProjectIssue.js';
import ProjectMilestone from '../../../models/ProjectMilestone.js';
import ProjectBilling from '../../../models/ProjectBilling.js';
import ProjectRevenueRecognition from '../../../models/ProjectRevenueRecognition.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// PROJECT ANALYTICS & REPORTING
// ============================================

// Get comprehensive project dashboard/KPIs
router.get('/:projectId/analytics/dashboard', asyncHandler(async (req, res) => {
  const projectId = new mongoose.Types.ObjectId(req.params.projectId);

  const project = await Project.findById(projectId)
    .populate('project_manager_id', 'name')
    .populate('partner_id', 'name')
    .lean();

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const projectObj: any = { ...project };
  if (projectObj.project_manager_id) projectObj.project_manager_name = projectObj.project_manager_id.name;
  if (projectObj.partner_id) projectObj.partner_name = projectObj.partner_id.name;

  // Budget vs Actuals
  const budgets = await ProjectBudget.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: '$budget_type',
        planned: { $sum: '$planned_amount' },
        committed: { $sum: '$committed_amount' },
        actual_amount: { $sum: '$actual_amount' },
        variance: { $sum: { $subtract: ['$planned_amount', '$actual_amount'] } },
      },
    },
    { $project: { budget_type: '$_id', planned: 1, committed: 1, actual_amount: 1, variance: 1, _id: 0 } },
  ]);

  // Task Statistics
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
    {
      $addFields: {
        hours_utilization_percent: {
          $cond: [
            { $gt: ['$total_estimated_hours', 0] },
            { $round: [{ $multiply: [{ $divide: ['$total_actual_hours', '$total_estimated_hours'] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
  ]);

  // Timesheet Summary
  const timesheetAgg = await Timesheet.aggregate([
    { $match: { project_id: projectId, approval_status: 'approved' } },
    {
      $group: {
        _id: null,
        total_hours: { $sum: '$hours_worked' },
        billable_hours: { $sum: { $cond: ['$is_billable', '$hours_worked', 0] } },
        active_resources: { $addToSet: '$user_id' },
        timesheet_entries: { $sum: 1 },
      },
    },
    {
      $project: {
        total_hours: 1, billable_hours: 1, timesheet_entries: 1,
        active_resources: { $size: '$active_resources' },
      },
    },
  ]);

  // Risk Summary
  const riskAgg = await ProjectRisk.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_risks: { $sum: 1 },
        identified_risks: { $sum: { $cond: [{ $eq: ['$status', 'identified'] }, 1, 0] } },
        high_risk_count: { $sum: { $cond: [{ $gte: ['$risk_score', 15] }, 1, 0] } },
        critical_risk_count: { $sum: { $cond: [{ $gte: ['$risk_score', 20] }, 1, 0] } },
        avg_risk_score: { $avg: '$risk_score' },
      },
    },
    { $addFields: { avg_risk_score: { $round: ['$avg_risk_score', 2] } } },
  ]);

  // Issue Summary
  const issueAgg = await ProjectIssue.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_issues: { $sum: 1 },
        open_issues: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        critical_issues: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        sla_breached_issues: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$sla_deadline', null] },
                  { $lt: ['$sla_deadline', new Date()] },
                  { $ne: ['$status', 'resolved'] },
                  { $ne: ['$status', 'closed'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // Milestone Progress
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
    { $addFields: { avg_completion_percent: 0 } },
  ]);

  // Billing Summary
  let billingData = { total_billed: 0, total_retention: 0, billing_count: 0 };
  try {
    const billingAgg = await ProjectBilling.aggregate([
      { $match: { project_id: projectId, status: 'billed' } },
      { $group: { _id: null, total_billed: { $sum: '$amount' }, total_retention: { $sum: '$retention_amount' }, billing_count: { $sum: 1 } } },
    ]);
    if (billingAgg[0]) billingData = billingAgg[0];
  } catch (err) { /* table might not exist */ }

  // Revenue Recognition
  let revenueData = { total_recognized: 0, total_deferred: 0, avg_completion: 0 };
  try {
    const revenueAgg = await ProjectRevenueRecognition.aggregate([
      { $match: { project_id: projectId } },
      { $group: { _id: null, total_recognized: { $sum: '$recognized_amount' }, total_deferred: { $sum: '$deferred_amount' }, avg_completion: { $avg: '$completion_percentage' } } },
    ]);
    if (revenueAgg[0]) revenueData = revenueAgg[0];
  } catch (err) { /* table might not exist */ }

  // Calculate profit margin
  const totalRevenue = revenueData.total_recognized || 0;
  const totalCosts = budgets.reduce((sum, row) => sum + (row.actual_amount || 0), 0);
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

  res.json({
    project: projectObj,
    budgets,
    tasks: taskAgg[0] || {},
    timesheets: timesheetAgg[0] || {},
    risks: riskAgg[0] || {},
    issues: issueAgg[0] || {},
    milestones: milestoneAgg[0] || {},
    billing: billingData,
    revenue: revenueData,
    profit_margin: profitMargin,
  });
}));

// ============================================
// EARNED VALUE MANAGEMENT (EVM)
// ============================================

router.get('/:projectId/analytics/evm', asyncHandler(async (req, res) => {
  const projectId = new mongoose.Types.ObjectId(req.params.projectId);

  const project = await Project.findById(projectId).lean();
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Planned Value (PV)
  const pvAgg = await ProjectBudget.aggregate([
    { $match: { project_id: projectId, budget_type: { $in: ['opex', 'capex'] } } },
    { $group: { _id: null, planned_value: { $sum: '$planned_amount' } } },
  ]);

  // Earned Value (EV)
  const evAgg = await ProjectTask.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        earned_value: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'done'] }, then: { $multiply: [{ $ifNull: ['$estimated_hours', 0] }, 100] } },
                { case: { $eq: ['$status', 'in_progress'] }, then: { $multiply: [{ $ifNull: ['$estimated_hours', 0] }, 50] } },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ]);

  // Actual Cost (AC)
  const acAgg = await ProjectCost.aggregate([
    { $match: { project_id: projectId } },
    { $group: { _id: null, actual_cost: { $sum: '$amount' } } },
  ]);

  const PV = pvAgg[0]?.planned_value || 0;
  const EV = evAgg[0]?.earned_value || 0;
  const AC = acAgg[0]?.actual_cost || 0;

  const CV = EV - AC;
  const SV = EV - PV;
  const CPI = AC > 0 ? EV / AC : 0;
  const SPI = PV > 0 ? EV / PV : 0;

  const BAC = PV;
  const EAC = CPI > 0 ? BAC / CPI : BAC;
  const ETC = EAC - AC;
  const VAC = BAC - EAC;
  const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 0;

  // Completion percentage
  const completionAgg = await ProjectTask.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_tasks: { $sum: 1 },
        completed_tasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      },
    },
  ]);

  const totalTasks = completionAgg[0]?.total_tasks || 0;
  const completedTasks = completionAgg[0]?.completed_tasks || 0;
  const completionPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  res.json({
    planned_value: PV,
    earned_value: EV,
    actual_cost: AC,
    cost_variance: CV,
    schedule_variance: SV,
    cost_performance_index: CPI,
    schedule_performance_index: SPI,
    budget_at_completion: BAC,
    estimate_at_completion: EAC,
    estimate_to_complete: ETC,
    variance_at_completion: VAC,
    to_complete_performance_index: TCPI,
    completion_percentage: completionPercent,
    interpretation: {
      cost_status: CV >= 0 ? 'under_budget' : 'over_budget',
      schedule_status: SV >= 0 ? 'on_schedule' : 'behind_schedule',
      cpi_status: CPI >= 1 ? 'efficient' : 'inefficient',
      spi_status: SPI >= 1 ? 'on_schedule' : 'behind_schedule',
    },
  });
}));

// ============================================
// BURN RATE & CASH FLOW
// ============================================

router.get('/:projectId/analytics/burn-rate', asyncHandler(async (req, res) => {
  const projectId = new mongoose.Types.ObjectId(req.params.projectId);
  const { period = 'month' } = req.query;

  let dateFormat: string;
  if (period === 'week') {
    dateFormat = '%Y-W%V';
  } else if (period === 'quarter') {
    dateFormat = '%Y-Q';
  } else {
    dateFormat = '%Y-%m';
  }

  // Burn rate - costs over time
  let burnRate: any[] = [];
  try {
    burnRate = await ProjectCost.aggregate([
      { $match: { project_id: projectId, cost_date: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$cost_date' } },
          cost_amount: { $sum: '$amount' },
          cost_count: { $sum: 1 },
        },
      },
      { $project: { period: '$_id', cost_amount: 1, cost_count: 1, _id: 0 } },
      { $sort: { period: 1 } },
    ]);
  } catch (err) {
    console.error('Error fetching burn rate:', err);
  }

  // Billing over time
  let billing: any[] = [];
  try {
    billing = await ProjectBilling.aggregate([
      { $match: { project_id: projectId, billing_date: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$billing_date' } },
          billing_amount: { $sum: '$amount' },
          billing_count: { $sum: 1 },
        },
      },
      { $project: { period: '$_id', billing_amount: 1, billing_count: 1, _id: 0 } },
      { $sort: { period: 1 } },
    ]);
  } catch (err) {
    console.error('Error fetching billing:', err);
  }

  res.json({
    burn_rate: burnRate,
    billing,
  });
}));

// ============================================
// RISK HEAT MAP
// ============================================

router.get('/:projectId/analytics/risk-heatmap', asyncHandler(async (req, res) => {
  const projectId = new mongoose.Types.ObjectId(req.params.projectId);

  const result = await ProjectRisk.aggregate([
    { $match: { project_id: projectId } },
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
            risk_score: '$risk_score',
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

export default router;

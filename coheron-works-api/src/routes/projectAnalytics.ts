import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// PROJECT ANALYTICS & REPORTING
// ============================================

// Get comprehensive project dashboard/KPIs
router.get('/:projectId/analytics/dashboard', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Project basic info
    const projectResult = await pool.query(
      `SELECT p.*, 
              u.name as project_manager_name,
              pt.name as partner_name
       FROM projects p
       LEFT JOIN users u ON p.project_manager_id = u.id
       LEFT JOIN partners pt ON p.partner_id = pt.id
       WHERE p.id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Budget vs Actuals
    const budgetResult = await pool.query(
      `SELECT 
         budget_type,
         SUM(planned_amount) as planned,
         SUM(committed_amount) as committed,
         SUM(actual_amount) as actual_amount,
         SUM(planned_amount) - SUM(actual_amount) as variance
       FROM project_budgets
       WHERE project_id = $1
       GROUP BY budget_type`,
      [projectId]
    );

    // Task Statistics
    const taskResult = await pool.query(
      `SELECT 
         COUNT(*) as total_tasks,
         COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
         COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
         COUNT(CASE WHEN status = 'backlog' THEN 1 END) as backlog_tasks,
         SUM(estimated_hours) as total_estimated_hours,
         SUM(actual_hours) as total_actual_hours,
         CASE 
           WHEN SUM(estimated_hours) > 0 
           THEN ROUND((SUM(actual_hours) / SUM(estimated_hours)) * 100, 2)
           ELSE 0
         END as hours_utilization_percent
       FROM project_tasks
       WHERE project_id = $1`,
      [projectId]
    );

    // Timesheet Summary
    const timesheetResult = await pool.query(
      `SELECT 
         SUM(hours_worked) as total_hours,
         SUM(CASE WHEN is_billable THEN hours_worked ELSE 0 END) as billable_hours,
         COUNT(DISTINCT user_id) as active_resources,
         COUNT(*) as timesheet_entries
       FROM timesheets
       WHERE project_id = $1 AND approval_status = 'approved'`,
      [projectId]
    );

    // Risk Summary
    const riskResult = await pool.query(
      `SELECT 
         COUNT(*) as total_risks,
         COUNT(CASE WHEN status = 'identified' THEN 1 END) as identified_risks,
         COUNT(CASE WHEN risk_score >= 15 THEN 1 END) as high_risk_count,
         COUNT(CASE WHEN risk_score >= 20 THEN 1 END) as critical_risk_count,
         ROUND(AVG(risk_score), 2) as avg_risk_score
       FROM project_risks
       WHERE project_id = $1`,
      [projectId]
    );

    // Issue Summary
    const issueResult = await pool.query(
      `SELECT 
         COUNT(*) as total_issues,
         COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
         COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_issues,
         COUNT(CASE WHEN sla_deadline IS NOT NULL AND sla_deadline < CURRENT_TIMESTAMP AND status != 'resolved' AND status != 'closed' THEN 1 END) as sla_breached_issues
       FROM project_issues
       WHERE project_id = $1`,
      [projectId]
    );

    // Milestone Progress
    const milestoneResult = await pool.query(
      `SELECT 
         COUNT(*) as total_milestones,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_milestones,
         COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed_milestones,
         0 as avg_completion_percent
       FROM project_milestones
       WHERE project_id = $1`,
      [projectId]
    );

    // Billing Summary - Use safe query that handles missing table
    let billingResult;
    try {
      billingResult = await pool.query(
        `SELECT 
           COALESCE(SUM(amount), 0) as total_billed,
           COALESCE(SUM(retention_amount), 0) as total_retention,
           COUNT(*) as billing_count
         FROM project_billing
         WHERE project_id = $1 AND status = 'billed'`,
        [projectId]
      );
    } catch (err: any) {
      // If table doesn't exist or column issue, return empty result
      billingResult = { rows: [{ total_billed: 0, total_retention: 0, billing_count: 0 }] };
    }

    // Revenue Recognition - Use safe query
    let revenueResult;
    try {
      revenueResult = await pool.query(
        `SELECT 
           COALESCE(SUM(recognized_amount), 0) as total_recognized,
           COALESCE(SUM(deferred_amount), 0) as total_deferred,
           COALESCE(AVG(completion_percentage), 0) as avg_completion
         FROM project_revenue_recognition
         WHERE project_id = $1`,
        [projectId]
      );
    } catch (err: any) {
      revenueResult = { rows: [{ total_recognized: 0, total_deferred: 0, avg_completion: 0 }] };
    }

    // Calculate profit margin
    const totalRevenue = parseFloat(revenueResult.rows[0]?.total_recognized || '0');
    const totalCosts = budgetResult.rows.reduce((sum, row) => {
      const actual = parseFloat(row.actual_amount || '0');
      return sum + actual;
    }, 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

    res.json({
      project: project,
      budgets: budgetResult.rows,
      tasks: taskResult.rows[0] || {},
      timesheets: timesheetResult.rows[0] || {},
      risks: riskResult.rows[0] || {},
      issues: issueResult.rows[0] || {},
      milestones: milestoneResult.rows[0] || {},
      billing: billingResult.rows[0] || {},
      revenue: revenueResult.rows[0] || {},
      profit_margin: profitMargin,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, code: error.code });
  }
});

// ============================================
// EARNED VALUE MANAGEMENT (EVM)
// ============================================

router.get('/:projectId/analytics/evm', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Get project dates
    const project = await pool.query(
      'SELECT start_date, end_date FROM projects WHERE id = $1',
      [projectId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const startDate = project.rows[0].start_date;
    const endDate = project.rows[0].end_date;
    const today = new Date();

    // Planned Value (PV) - Budgeted Cost of Work Scheduled
    const pvResult = await pool.query(
      `SELECT 
         COALESCE(SUM(planned_amount), 0) as planned_value
       FROM project_budgets
       WHERE project_id = $1 AND budget_type IN ('opex', 'capex')`,
      [projectId]
    );

    // Earned Value (EV) - Budgeted Cost of Work Performed
    // Based on task completion - simplified calculation
    const evResult = await pool.query(
      `SELECT 
         COALESCE(SUM(
           CASE 
             WHEN t.status = 'done' THEN COALESCE(t.estimated_hours, 0) * 100
             WHEN t.status = 'in_progress' THEN COALESCE(t.estimated_hours, 0) * 50
             ELSE 0
           END
         ), 0) as earned_value
       FROM project_tasks t
       WHERE t.project_id = $1`,
      [projectId]
    );

    // Actual Cost (AC) - Actual Cost of Work Performed
    const acResult = await pool.query(
      `SELECT 
         COALESCE(SUM(amount), 0) as actual_cost
       FROM project_costs
       WHERE project_id = $1`,
      [projectId]
    );

    const PV = parseFloat(pvResult.rows[0]?.planned_value || '0');
    const EV = parseFloat(evResult.rows[0]?.earned_value || '0');
    const AC = parseFloat(acResult.rows[0]?.actual_cost || '0');

    // EVM Metrics
    const CV = EV - AC; // Cost Variance
    const SV = EV - PV; // Schedule Variance
    const CPI = AC > 0 ? EV / AC : 0; // Cost Performance Index
    const SPI = PV > 0 ? EV / PV : 0; // Schedule Performance Index

    // Forecasts
    const BAC = PV; // Budget at Completion
    const EAC = CPI > 0 ? BAC / CPI : BAC; // Estimate at Completion
    const ETC = EAC - AC; // Estimate to Complete
    const VAC = BAC - EAC; // Variance at Completion
    const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 0; // To Complete Performance Index

    // Calculate project completion percentage
    const completionResult = await pool.query(
      `SELECT 
         COUNT(*) as total_tasks,
         COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks
       FROM project_tasks
       WHERE project_id = $1`,
      [projectId]
    );

    const totalTasks = parseInt(completionResult.rows[0]?.total_tasks || '0');
    const completedTasks = parseInt(completionResult.rows[0]?.completed_tasks || '0');
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
  } catch (error: any) {
    console.error('Error calculating EVM:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================
// BURN RATE & CASH FLOW
// ============================================

router.get('/:projectId/analytics/burn-rate', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const { period = 'month' } = req.query; // 'week', 'month', 'quarter'

    let dateFormat = "YYYY-MM";
    let interval = "1 month";
    if (period === 'week') {
      dateFormat = "YYYY-'W'WW";
      interval = "1 week";
    } else if (period === 'quarter') {
      dateFormat = "YYYY-Q";
      interval = "3 months";
    }

    // Burn rate - costs over time
    let burnRateResult;
    try {
      burnRateResult = await pool.query(
        `SELECT 
           TO_CHAR(cost_date, $1) as period,
           COALESCE(SUM(amount), 0) as cost_amount,
           COUNT(*) as cost_count
         FROM project_costs
         WHERE project_id = $2 AND cost_date IS NOT NULL
         GROUP BY TO_CHAR(cost_date, $1)
         ORDER BY period`,
        [dateFormat, projectId]
      );
    } catch (err: any) {
      console.error('Error fetching burn rate:', err);
      burnRateResult = { rows: [] };
    }

    // Billing over time
    let billingResult;
    try {
      billingResult = await pool.query(
        `SELECT 
           TO_CHAR(billing_date, $1) as period,
           COALESCE(SUM(amount), 0) as billing_amount,
           COUNT(*) as billing_count
         FROM project_billing
         WHERE project_id = $2 AND billing_date IS NOT NULL
         GROUP BY TO_CHAR(billing_date, $1)
         ORDER BY period`,
        [dateFormat, projectId]
      );
    } catch (err: any) {
      console.error('Error fetching billing:', err);
      billingResult = { rows: [] };
    }

    res.json({
      burn_rate: burnRateResult.rows,
      billing: billingResult.rows,
    });
  } catch (error: any) {
    console.error('Error calculating burn rate:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================
// RISK HEAT MAP
// ============================================

router.get('/:projectId/analytics/risk-heatmap', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const result = await pool.query(
      `SELECT 
         probability,
         impact,
         COUNT(*) as risk_count,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', id,
             'title', title,
             'status', status,
             'category', category,
             'risk_score', risk_score
           )
         ) as risks
       FROM project_risks
       WHERE project_id = $1
       GROUP BY probability, impact
       ORDER BY probability DESC, impact DESC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching risk heatmap:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;


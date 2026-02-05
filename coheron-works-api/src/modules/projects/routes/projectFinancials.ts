import express from 'express';
import ProjectBudget from '../../../models/ProjectBudget.js';
import ProjectCost from '../../../models/ProjectCost.js';
import ProjectBilling from '../../../models/ProjectBilling.js';
import ProjectRevenueRecognition from '../../../models/ProjectRevenueRecognition.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();
router.use(authenticate);

// ============================================
// PROJECT BUDGETS
// ============================================

// Get project budgets
router.get('/:projectId/budgets', asyncHandler(async (req, res) => {
  const { budget_type, status } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (budget_type) filter.budget_type = budget_type;
  if (status) filter.status = status;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ProjectBudget.find(filter)
      .populate('approved_by', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, ProjectBudget
  );

  const data = paginatedResult.data.map((b: any) => {
    const obj: any = { ...b };
    if (obj.approved_by) obj.approved_by_name = obj.approved_by.name;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create budget
router.post('/:projectId/budgets', asyncHandler(async (req, res) => {
  const { budget_type, category, planned_amount, committed_amount, actual_amount, status } = req.body;

  if (!budget_type) {
    return res.status(400).json({ error: 'Budget type is required' });
  }

  const budget = await ProjectBudget.create({
    project_id: req.params.projectId,
    budget_type,
    category,
    planned_amount: planned_amount || 0,
    committed_amount: committed_amount || 0,
    actual_amount: actual_amount || 0,
    status: status || 'draft',
  });

  res.status(201).json(budget);
}));

// Update budget
router.put('/budgets/:id', asyncHandler(async (req, res) => {
  const { budget_type, category, planned_amount, committed_amount, actual_amount, revision_number, status, approved_by } = req.body;

  const fields: Record<string, any> = {
    budget_type, category, planned_amount, committed_amount,
    actual_amount, revision_number, status, approved_by,
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

  const budget = await ProjectBudget.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }

  res.json(budget);
}));

// Delete budget
router.delete('/budgets/:id', asyncHandler(async (req, res) => {
  const budget = await ProjectBudget.findByIdAndDelete(req.params.id);

  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }

  res.json({ message: 'Budget deleted successfully' });
}));

// ============================================
// PROJECT COSTS
// ============================================

// Get project costs
router.get('/:projectId/costs', asyncHandler(async (req, res) => {
  const { cost_type, date_from, date_to } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (cost_type) filter.cost_type = cost_type;
  if (date_from || date_to) {
    filter.cost_date = {};
    if (date_from) filter.cost_date.$gte = new Date(date_from as string);
    if (date_to) filter.cost_date.$lte = new Date(date_to as string);
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ProjectCost.find(filter)
      .populate('task_id', 'name')
      .sort({ cost_date: -1 })
      .lean(),
    pagination, filter, ProjectCost
  );

  const data = paginatedResult.data.map((c: any) => {
    const obj: any = { ...c };
    if (obj.task_id) obj.task_name = obj.task_id.name;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create cost entry
router.post('/:projectId/costs', asyncHandler(async (req, res) => {
  const { task_id, cost_type, description, amount, currency, cost_date, invoice_id, purchase_order_id } = req.body;

  if (!cost_type || !amount || !cost_date) {
    return res.status(400).json({ error: 'Cost type, amount, and date are required' });
  }

  const cost = await ProjectCost.create({
    project_id: req.params.projectId,
    task_id, cost_type, description, amount,
    currency: currency || 'USD',
    cost_date, invoice_id, purchase_order_id,
  });

  // Update budget actual amount
  const budgetType = ['labor', 'subcontractor', 'overhead'].includes(cost_type) ? 'opex'
    : cost_type === 'material' ? 'capex' : 'opex';

  await ProjectBudget.updateOne(
    { project_id: req.params.projectId, budget_type: budgetType },
    { $inc: { actual_amount: amount } }
  );

  res.status(201).json(cost);
}));

// Update cost
router.put('/costs/:id', asyncHandler(async (req, res) => {
  const { task_id, cost_type, description, amount, currency, cost_date, invoice_id, purchase_order_id } = req.body;

  const oldCost = await ProjectCost.findById(req.params.id);

  const fields: Record<string, any> = {
    task_id, cost_type, description, amount, currency, cost_date, invoice_id, purchase_order_id,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const cost = await ProjectCost.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!cost) {
    return res.status(404).json({ error: 'Cost not found' });
  }

  // Update budget if amount changed
  if (amount !== undefined && oldCost) {
    const oldAmount = parseFloat(String(oldCost.amount)) || 0;
    const newAmount = parseFloat(amount);
    const diff = newAmount - oldAmount;

    if (diff !== 0) {
      const budgetType = ['labor', 'subcontractor', 'overhead'].includes(oldCost.cost_type) ? 'opex'
        : oldCost.cost_type === 'material' ? 'capex' : 'opex';

      await ProjectBudget.updateOne(
        { project_id: oldCost.project_id, budget_type: budgetType },
        { $inc: { actual_amount: diff } }
      );
    }
  }

  res.json(cost);
}));

// Delete cost
router.delete('/costs/:id', asyncHandler(async (req, res) => {
  const cost = await ProjectCost.findById(req.params.id);

  const result = await ProjectCost.findByIdAndDelete(req.params.id);

  if (!result) {
    return res.status(404).json({ error: 'Cost not found' });
  }

  // Update budget
  if (cost) {
    const amount = parseFloat(String(cost.amount)) || 0;
    const budgetType = ['labor', 'subcontractor', 'overhead'].includes(cost.cost_type) ? 'opex'
      : cost.cost_type === 'material' ? 'capex' : 'opex';

    await ProjectBudget.updateOne(
      { project_id: cost.project_id, budget_type: budgetType },
      { $inc: { actual_amount: -amount } }
    );
    // Ensure non-negative
    await ProjectBudget.updateOne(
      { project_id: cost.project_id, budget_type: budgetType, actual_amount: { $lt: 0 } },
      { actual_amount: 0 }
    );
  }

  res.json({ message: 'Cost deleted successfully' });
}));

// ============================================
// PROJECT BILLING
// ============================================

// Get project billing
router.get('/:projectId/billing', asyncHandler(async (req, res) => {
  const filter = { project_id: req.params.projectId };
  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ProjectBilling.find(filter)
      .populate('milestone_id', 'name')
      .sort({ billing_date: -1 })
      .lean(),
    pagination, filter, ProjectBilling
  );

  const data = paginatedResult.data.map((b: any) => {
    const obj: any = { ...b };
    if (obj.milestone_id) obj.milestone_name = obj.milestone_id.name;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create billing entry
router.post('/:projectId/billing', asyncHandler(async (req, res) => {
  const { milestone_id, invoice_id, billing_type, billing_percentage, amount, retention_amount, billing_date } = req.body;

  if (!billing_type || !amount || !billing_date) {
    return res.status(400).json({ error: 'Billing type, amount, and date are required' });
  }

  const billing = await ProjectBilling.create({
    project_id: req.params.projectId,
    milestone_id, invoice_id, billing_type, billing_percentage,
    amount: req.body.amount || req.body.billed_amount || 0,
    retention_amount: retention_amount || 0,
    billing_date,
    status: 'draft',
  });

  res.status(201).json(billing);
}));

// ============================================
// REVENUE RECOGNITION
// ============================================

// Get revenue recognition
router.get('/:projectId/revenue', asyncHandler(async (req, res) => {
  const entries = await ProjectRevenueRecognition.find({ project_id: req.params.projectId })
    .sort({ recognition_date: -1 })
    .lean();
  res.json(entries);
}));

// Create revenue recognition entry
router.post('/:projectId/revenue', asyncHandler(async (req, res) => {
  const { recognition_method, completion_percentage, recognized_amount, deferred_amount, recognition_date } = req.body;

  if (!recognition_method || !recognized_amount || !recognition_date) {
    return res.status(400).json({ error: 'Recognition method, amount, and date are required' });
  }

  const entry = await ProjectRevenueRecognition.create({
    project_id: req.params.projectId,
    recognition_method, completion_percentage, recognized_amount,
    deferred_amount: deferred_amount || 0,
    recognition_date,
    accounting_period: req.body.accounting_period ||
      `${new Date(recognition_date).getFullYear()}-Q${Math.floor(new Date(recognition_date).getMonth() / 3) + 1}`,
  });

  res.status(201).json(entry);
}));

// ============================================
// FINANCIAL SUMMARY / ANALYTICS
// ============================================

router.get('/:projectId/financial-summary', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;

  // Budget summary by type
  const budgets = await ProjectBudget.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: '$budget_type',
        total_planned: { $sum: '$planned_amount' },
        total_committed: { $sum: '$committed_amount' },
        total_actual: { $sum: '$actual_amount' },
      },
    },
    { $project: { budget_type: '$_id', total_planned: 1, total_committed: 1, total_actual: 1, _id: 0 } },
  ]);

  // Cost summary by type
  const costs = await ProjectCost.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: '$cost_type',
        total_cost: { $sum: '$amount' },
        cost_count: { $sum: 1 },
      },
    },
    { $project: { cost_type: '$_id', total_cost: 1, cost_count: 1, _id: 0 } },
  ]);

  // Billing summary
  const billingAgg = await ProjectBilling.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_billed: { $sum: '$amount' },
        total_retention: { $sum: '$retention_amount' },
        billing_count: { $sum: 1 },
      },
    },
  ]);

  // Revenue summary
  const revenueAgg = await ProjectRevenueRecognition.aggregate([
    { $match: { project_id: projectId } },
    {
      $group: {
        _id: null,
        total_recognized: { $sum: '$recognized_amount' },
        total_deferred: { $sum: '$deferred_amount' },
        avg_completion: { $avg: '$completion_percentage' },
      },
    },
  ]);

  res.json({
    budgets,
    costs,
    billing: billingAgg[0] || {},
    revenue: revenueAgg[0] || {},
  });
}));

export default router;

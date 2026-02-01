import express from 'express';
import Expense from '../../../models/Expense.js';
import ExpenseReport from '../../../models/ExpenseReport.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import documentNumberingService from '../../../services/documentNumberingService.js';

const router = express.Router();

// GET / - List expenses
router.get('/', asyncHandler(async (req: any, res) => {
  const pagination = getPaginationParams(req.query);
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.from || req.query.to) {
    filter.expense_date = {} as any;
    if (req.query.from) (filter.expense_date as any)[""] = new Date(req.query.from as string);
    if (req.query.to) (filter.expense_date as any)[""] = new Date(req.query.to as string);
  }
  const result = await paginateQuery(Expense.find(filter).populate('employee_id').sort({ created_at: -1 }).lean(), pagination, filter, Expense);
  res.json(result);
}));

// POST / - Create expense
router.post('/', asyncHandler(async (req: any, res) => {
  const expenseNumber = await documentNumberingService.getNextNumber(req.user.tenant_id, 'expense');
  const expense = await Expense.create({ ...req.body, tenant_id: req.user.tenant_id, expense_number: expenseNumber });
  res.status(201).json(expense);
}));

// GET /:id
router.get('/:id', asyncHandler(async (req: any, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('employee_id');
  if (!expense) return res.status(404).json({ error: 'Not found' });
  res.json(expense);
}));

// PUT /:id - Update (draft only)
router.put('/:id', asyncHandler(async (req: any, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if ((expense as any).status !== 'draft') return res.status(400).json({ error: 'Can only edit draft expenses' });
  Object.assign(expense, req.body);
  await expense.save();
  res.json(expense);
}));

// POST /:id/submit
router.post('/:id/submit', asyncHandler(async (req: any, res) => {
  const expense: any = await Expense.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (expense.status !== 'draft') return res.status(400).json({ error: 'Only draft expenses can be submitted' });
  expense.status = 'submitted';
  await expense.save();
  res.json(expense);
}));

// POST /:id/approve
router.post('/:id/approve', asyncHandler(async (req: any, res) => {
  const expense: any = await Expense.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (expense.status !== 'submitted') return res.status(400).json({ error: 'Only submitted expenses can be approved' });
  expense.status = 'approved';
  expense.approved_by = req.user._id;
  expense.approved_at = new Date();
  await expense.save();
  res.json(expense);
}));

// POST /:id/reject
router.post('/:id/reject', asyncHandler(async (req: any, res) => {
  const expense: any = await Expense.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (expense.status !== 'submitted') return res.status(400).json({ error: 'Only submitted expenses can be rejected' });
  expense.status = 'rejected';
  expense.rejected_reason = req.body.reason || '';
  await expense.save();
  res.json(expense);
}));

// POST /:id/reimburse
router.post('/:id/reimburse', asyncHandler(async (req: any, res) => {
  const expense: any = await Expense.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (expense.status !== 'approved') return res.status(400).json({ error: 'Only approved expenses can be reimbursed' });
  expense.status = 'reimbursed';
  expense.reimbursement_date = new Date();
  expense.reimbursement_reference = req.body.reference || '';
  await expense.save();
  res.json(expense);
}));

// POST /reports - Create expense report
router.post('/reports', asyncHandler(async (req: any, res) => {
  const reportNumber = await documentNumberingService.getNextNumber(req.user.tenant_id, 'expense_report');
  const expenses = await Expense.find({ _id: { "": req.body.expense_ids }, tenant_id: req.user.tenant_id });
  const totalAmount = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const report = await ExpenseReport.create({
    ...req.body, tenant_id: req.user.tenant_id, report_number: reportNumber, total_amount: totalAmount,
  });
  res.status(201).json(report);
}));

// GET /reports
router.get('/reports', asyncHandler(async (req: any, res) => {
  const pagination = getPaginationParams(req.query);
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  const result = await paginateQuery(ExpenseReport.find(filter).populate('employee_id').sort({ created_at: -1 }).lean(), pagination, filter, ExpenseReport);
  res.json(result);
}));

// GET /reports/:id
router.get('/reports/:id', asyncHandler(async (req: any, res) => {
  const report = await ExpenseReport.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('expense_ids').populate('employee_id');
  if (!report) return res.status(404).json({ error: 'Not found' });
  res.json(report);
}));

// POST /reports/:id/submit
router.post('/reports/:id/submit', asyncHandler(async (req: any, res) => {
  const report: any = await ExpenseReport.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (report.status !== 'draft') return res.status(400).json({ error: 'Only draft reports can be submitted' });
  report.status = 'submitted';
  report.submitted_at = new Date();
  await report.save();
  res.json(report);
}));

// POST /reports/:id/approve
router.post('/reports/:id/approve', asyncHandler(async (req: any, res) => {
  const report: any = await ExpenseReport.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (report.status !== 'submitted') return res.status(400).json({ error: 'Only submitted reports can be approved' });
  report.status = 'approved';
  report.approved_by = req.user._id;
  report.approved_at = new Date();
  await report.save();
  res.json(report);
}));

export default router;

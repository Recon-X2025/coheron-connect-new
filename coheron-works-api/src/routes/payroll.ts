import express from 'express';
import { Payslip, SalaryStructure } from '../models/Payroll.js';
import { Employee } from '../models/Employee.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get payslips
router.get('/payslips', asyncHandler(async (req, res) => {
  const { employee_id, from_date, to_date } = req.query;
  const filter: any = {};

  if (employee_id) {
    filter.employee_id = employee_id;
  }
  if (from_date && to_date) {
    filter.date_from = { $gte: from_date, $lte: to_date };
  }

  const payslips = await Payslip.find(filter)
    .populate('employee_id', 'name employee_id')
    .sort({ date_from: -1 });

  const result = payslips.map((p: any) => {
    const obj = p.toJSON();
    if (obj.employee_id && typeof obj.employee_id === 'object') {
      obj.employee_name = obj.employee_id.name;
      obj.emp_id = obj.employee_id.employee_id;
      obj.employee_id = obj.employee_id._id;
    }
    return obj;
  });

  res.json(result);
}));

// Get salary structure
router.get('/salary-structure/:employee_id', asyncHandler(async (req, res) => {
  const { employee_id } = req.params;
  const structures = await SalaryStructure.find({
    employee_id,
    is_active: true,
  }).sort({ component_type: 1, component_name: 1 }).lean();

  res.json(structures);
}));

// Create salary structure
router.post('/salary-structure', asyncHandler(async (req, res) => {
  const { employee_id, component_type, component_name, amount, calculation_type, percentage } = req.body;

  const structure = await SalaryStructure.create({
    employee_id, component_type, component_name, amount, calculation_type, percentage
  });

  res.status(201).json(structure);
}));

// Update salary structure
router.put('/salary-structure/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, calculation_type, percentage, is_active } = req.body;

  const updateFields: any = {};
  if (amount !== undefined) updateFields.amount = amount;
  if (calculation_type !== undefined) updateFields.calculation_type = calculation_type;
  if (percentage !== undefined) updateFields.percentage = percentage;
  if (is_active !== undefined) updateFields.is_active = is_active;

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const structure = await SalaryStructure.findByIdAndUpdate(id, updateFields, { new: true });

  if (!structure) {
    return res.status(404).json({ error: 'Salary structure not found' });
  }
  res.json(structure);
}));

// Delete salary structure
router.delete('/salary-structure/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const structure = await SalaryStructure.findByIdAndDelete(id);

  if (!structure) {
    return res.status(404).json({ error: 'Salary structure not found' });
  }
  res.json({ message: 'Salary structure deleted successfully' });
}));

// Create payslip
router.post('/payslips', asyncHandler(async (req, res) => {
  const { employee_id, name, date_from, date_to, basic_wage, gross_wage, net_wage } = req.body;

  const payslip = await Payslip.create({
    employee_id, name, date_from, date_to, basic_wage, gross_wage, net_wage, state: 'draft'
  });

  res.status(201).json(payslip);
}));

// Update payslip
router.put('/payslips/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { basic_wage, gross_wage, net_wage, state } = req.body;

  const updateFields: any = {};
  if (basic_wage !== undefined) updateFields.basic_wage = basic_wage;
  if (gross_wage !== undefined) updateFields.gross_wage = gross_wage;
  if (net_wage !== undefined) updateFields.net_wage = net_wage;
  if (state !== undefined) updateFields.state = state;

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const payslip = await Payslip.findByIdAndUpdate(id, updateFields, { new: true });

  if (!payslip) {
    return res.status(404).json({ error: 'Payslip not found' });
  }
  res.json(payslip);
}));

// Get payroll statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const employeeCount = await Employee.countDocuments();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const payslipStats = await Payslip.aggregate([
    { $match: { date_from: { $gte: startOfMonth } } },
    {
      $group: {
        _id: null,
        total_payslips: { $sum: 1 },
        total_amount: { $sum: '$net_wage' },
        completed: { $sum: { $cond: [{ $eq: ['$state', 'done'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$state', 'draft'] }, 1, 0] } },
      },
    },
  ]);

  const stats = payslipStats[0] || { total_amount: 0, pending: 0 };

  res.json({
    total_employees: employeeCount,
    this_month_payroll: stats.total_amount || 0,
    pending_approvals: stats.pending || 0,
    compliance_status: 98,
  });
}));

export default router;

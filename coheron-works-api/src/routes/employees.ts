import express from 'express';
import { Employee } from '../models/Employee.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get all employees
router.get('/', asyncHandler(async (req, res) => {
  const filter: any = {};
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Employee.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    Employee
  );
  res.json(result);
}));

// Get employee by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await Employee.findById(id).lean();

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(employee);
}));

// Create employee
router.post('/', asyncHandler(async (req, res) => {
  const {
    employee_id, name, work_email, work_phone, job_title,
    department_id, manager_id, hire_date, employment_type
  } = req.body;

  const employee = await Employee.create({
    employee_id, name, work_email, work_phone, job_title,
    department_id, manager_id, hire_date, employment_type
  });

  res.status(201).json(employee);
}));

// Update employee
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name, work_email, work_phone, job_title,
    department_id, manager_id, hire_date, employment_type
  } = req.body;

  const employee = await Employee.findByIdAndUpdate(
    id,
    { name, work_email, work_phone, job_title, department_id, manager_id, hire_date, employment_type },
    { new: true }
  );

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(employee);
}));

// Delete employee
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await Employee.findByIdAndDelete(id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json({ message: 'Employee deleted successfully' });
}));

// Get employee leave balances
router.get('/:id/leave-balances', asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).select('leave_balances name employee_id').lean();
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(employee);
}));

// Add document to employee
router.post('/:id/documents', asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { $push: { documents: req.body } },
    { new: true }
  );
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.status(201).json(employee);
}));

export default router;

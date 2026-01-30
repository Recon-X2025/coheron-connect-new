import express from 'express';
import { Employee } from '../models/Employee.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  TaxInput,
  calculateOldRegimeTax,
  calculateNewRegimeTax,
  compareTaxRegimes,
  projectAnnualTax,
  generateForm16,
} from '../services/taxCalculationService.js';

const router = express.Router();

// Helper: build TaxInput from employee + declarations
function buildTaxInput(employee: any, declarations: any): TaxInput {
  const salary = employee.salary || {};
  const gross = salary.ctc || salary.basic || 0;

  return {
    gross_annual_salary: declarations?.gross_annual_salary || gross * 12,
    basic_salary: declarations?.basic_salary || (salary.basic || 0) * 12,
    hra_received: declarations?.hra_received || (salary.hra || 0) * 12,
    rent_paid: declarations?.rent_paid || 0,
    metro_city: declarations?.metro_city || false,
    lta_claimed: declarations?.lta_claimed || 0,
    section_80c: declarations?.section_80c || 0,
    section_80d: declarations?.section_80d || 0,
    section_24b: declarations?.section_24b || 0,
    other_deductions: declarations?.other_deductions || 0,
  };
}

// GET /employees/:id/tax-declarations
router.get('/employees/:id/tax-declarations', asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).lean();
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const declarations = (employee as any).tax_declarations || {};
  res.json({ employee_id: req.params.id, ...declarations });
}));

// PUT /employees/:id/tax-declarations
router.put('/employees/:id/tax-declarations', asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const { section_80c, section_80d, section_24b, ...rest } = req.body;

  // Cap validation
  const declarations: any = { ...rest };
  if (section_80c !== undefined) declarations.section_80c = Math.min(section_80c, 150000);
  if (section_80d !== undefined) declarations.section_80d = Math.min(section_80d, 25000);
  if (section_24b !== undefined) declarations.section_24b = Math.min(section_24b, 200000);

  await Employee.findByIdAndUpdate(req.params.id, {
    $set: { tax_declarations: declarations },
  });

  res.json({ employee_id: req.params.id, tax_declarations: declarations });
}));

// POST /employees/:id/tax-declarations/submit
router.post('/employees/:id/tax-declarations/submit', asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  await Employee.findByIdAndUpdate(req.params.id, {
    $set: { 'tax_declarations.status': 'submitted', 'tax_declarations.submitted_at': new Date() },
  });

  res.json({ employee_id: req.params.id, status: 'submitted' });
}));

// GET /employees/:id/tax-projection
router.get('/employees/:id/tax-projection', asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).lean();
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const declarations = (employee as any).tax_declarations || {};
  const regime = declarations.regime || (employee as any).tax_regime || 'new';
  const input = buildTaxInput(employee, declarations);

  const now = new Date();
  const fyEndMonth = 2; // March (0-indexed)
  let monthsRemaining: number;
  if (now.getMonth() >= 3) {
    monthsRemaining = 12 - (now.getMonth() - 3) - 1;
  } else {
    monthsRemaining = 2 - now.getMonth();
  }
  monthsRemaining = Math.max(0, Math.min(12, monthsRemaining));

  const salary = (employee as any).salary || {};
  const projection = projectAnnualTax(
    { gross_monthly: (salary.ctc || salary.basic || 0), gross_annual: input.gross_annual_salary },
    input,
    regime,
    monthsRemaining
  );

  res.json({ employee_id: req.params.id, regime, months_remaining: monthsRemaining, ...projection });
}));

// GET /employees/:id/tax-comparison
router.get('/employees/:id/tax-comparison', asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).lean();
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const declarations = (employee as any).tax_declarations || {};
  const input = buildTaxInput(employee, declarations);
  const comparison = compareTaxRegimes(input);

  res.json({ employee_id: req.params.id, ...comparison });
}));

// GET /employees/:id/form16
router.get('/employees/:id/form16', asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).lean();
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const declarations = (employee as any).tax_declarations || {};
  const regime = declarations.regime || (employee as any).tax_regime || 'new';
  const input = buildTaxInput(employee, declarations);
  const taxResult = regime === 'old' ? calculateOldRegimeTax(input) : calculateNewRegimeTax(input);

  const emp = employee as any;
  const form16 = generateForm16(
    {
      name: emp.name || '',
      pan: emp.pan_number || emp.pan || '',
      employee_id: emp.employee_id || '',
    },
    taxResult,
    {
      name: req.query.employer_name as string || 'CoheronERP',
      tan: req.query.employer_tan as string || '',
      address: req.query.employer_address as string || '',
    },
    // TDS entries — would come from payroll in production; provide empty for now
    []
  );

  res.json(form16);
}));

export default router;

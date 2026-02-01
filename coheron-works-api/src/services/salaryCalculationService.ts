import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

interface SalaryComponent {
  label: string;
  amount: number;
  type: 'earning' | 'deduction';
  category?: string;
}

interface SalaryResult {
  employee_id: string;
  month: string;
  working_days: number;
  lop_days: number;
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  gross: number;
  total_deductions: number;
  net_pay: number;
  employer_contributions: SalaryComponent[];
}

export class SalaryCalculationService {
  private PF_EMPLOYEE_RATE = 0.12;
  private PF_EMPLOYER_RATE = 0.12;
  private PF_BASIC_CAP = 15000;
  private ESI_EMPLOYEE_RATE = 0.0075;
  private ESI_EMPLOYER_RATE = 0.0325;
  private ESI_GROSS_LIMIT = 21000;

  async calculateSalary(
    tenantId: string,
    employeeId: string,
    month: string,
    attendance?: { working_days: number; lop_days: number }
  ): Promise<SalaryResult> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const employee = await db.collection('employees').findOne({
      _id: new mongoose.Types.ObjectId(employeeId),
      tenant_id: new mongoose.Types.ObjectId(tenantId),
    });
    if (!employee) throw new NotFoundError('Employee');

    const salary = employee.salary || employee.ctc || 0;
    const monthlySalary = salary > 100000 ? salary / 12 : salary; // Assume > 1L is annual CTC

    // Basic structure (can be configured per company)
    const basicPercent = employee.basic_percent || 0.40;
    const hraPercent = employee.hra_percent || 0.20;
    const basic = Math.round(monthlySalary * basicPercent);
    const hra = Math.round(monthlySalary * hraPercent);
    const specialAllowance = Math.round(monthlySalary - basic - hra);

    // LOP deduction
    const workingDays = attendance?.working_days || 30;
    const lopDays = attendance?.lop_days || 0;
    const lopDeduction = lopDays > 0 ? Math.round((monthlySalary / workingDays) * lopDays) : 0;

    const effectiveBasic = basic - Math.round((basic / workingDays) * lopDays);
    const effectiveGross = monthlySalary - lopDeduction;

    // Earnings
    const earnings: SalaryComponent[] = [
      { label: 'Basic Salary', amount: effectiveBasic > 0 ? effectiveBasic : basic, type: 'earning', category: 'basic' },
      { label: 'HRA', amount: hra - Math.round((hra / workingDays) * lopDays), type: 'earning', category: 'hra' },
      { label: 'Special Allowance', amount: specialAllowance - Math.round((specialAllowance / workingDays) * lopDays), type: 'earning', category: 'special' },
    ];

    const gross = earnings.reduce((s, e) => s + e.amount, 0);

    // Deductions
    const deductions: SalaryComponent[] = [];
    const employerContribs: SalaryComponent[] = [];

    // PF (capped at Basic = 15000)
    const pfBasic = Math.min(effectiveBasic > 0 ? effectiveBasic : basic, this.PF_BASIC_CAP);
    const pfEmployee = Math.round(pfBasic * this.PF_EMPLOYEE_RATE);
    const pfEmployer = Math.round(pfBasic * this.PF_EMPLOYER_RATE);
    deductions.push({ label: 'PF (Employee)', amount: pfEmployee, type: 'deduction', category: 'pf' });
    employerContribs.push({ label: 'PF (Employer)', amount: pfEmployer, type: 'deduction', category: 'pf' });

    // ESI (only if gross <= 21000)
    if (gross <= this.ESI_GROSS_LIMIT) {
      const esiEmployee = Math.round(gross * this.ESI_EMPLOYEE_RATE);
      const esiEmployer = Math.round(gross * this.ESI_EMPLOYER_RATE);
      deductions.push({ label: 'ESI (Employee)', amount: esiEmployee, type: 'deduction', category: 'esi' });
      employerContribs.push({ label: 'ESI (Employer)', amount: esiEmployer, type: 'deduction', category: 'esi' });
    }

    // Professional Tax (simplified Karnataka slab)
    const pt = this.calculateProfessionalTax(gross, employee.state || 'KA');
    if (pt > 0) {
      deductions.push({ label: 'Professional Tax', amount: pt, type: 'deduction', category: 'pt' });
    }

    // LOP
    if (lopDeduction > 0) {
      deductions.push({ label: 'LOP Deduction', amount: lopDeduction, type: 'deduction', category: 'lop' });
    }

    // TDS (simplified — actual should use IT slab computation)
    const annualIncome = gross * 12;
    const tds = this.calculateMonthlyTDS(annualIncome);
    if (tds > 0) {
      deductions.push({ label: 'TDS', amount: tds, type: 'deduction', category: 'tds' });
    }

    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const netPay = gross - totalDeductions;

    return {
      employee_id: employeeId,
      month,
      working_days: workingDays,
      lop_days: lopDays,
      earnings,
      deductions,
      gross,
      total_deductions: totalDeductions,
      net_pay: Math.max(0, netPay),
      employer_contributions: employerContribs,
    };
  }

  private calculateProfessionalTax(monthlyGross: number, state: string): number {
    // Karnataka slabs (simplified)
    if (state === 'KA') {
      if (monthlyGross <= 15000) return 0;
      if (monthlyGross <= 25000) return 150;
      return 200;
    }
    // Maharashtra
    if (state === 'MH') {
      if (monthlyGross <= 7500) return 0;
      if (monthlyGross <= 10000) return 175;
      return 200; // max 2500/year, 200/month (Feb = 300)
    }
    // Default
    if (monthlyGross <= 15000) return 0;
    return 200;
  }

  private calculateMonthlyTDS(annualIncome: number): number {
    // New regime FY 2024-25 slabs (simplified)
    let tax = 0;
    const income = annualIncome - 75000; // Standard deduction
    if (income <= 300000) tax = 0;
    else if (income <= 700000) tax = (income - 300000) * 0.05;
    else if (income <= 1000000) tax = 20000 + (income - 700000) * 0.10;
    else if (income <= 1200000) tax = 50000 + (income - 1000000) * 0.15;
    else if (income <= 1500000) tax = 80000 + (income - 1200000) * 0.20;
    else tax = 140000 + (income - 1500000) * 0.30;

    // Rebate u/s 87A for income up to 7L
    if (income <= 700000) tax = 0;

    // Cess 4%
    tax = tax * 1.04;

    return Math.round(tax / 12);
  }
}

export const salaryCalculationService = new SalaryCalculationService();
export default salaryCalculationService;

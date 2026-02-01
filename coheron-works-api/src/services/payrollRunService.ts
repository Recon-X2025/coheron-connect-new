import mongoose from 'mongoose';
import PayrollRun from '../models/PayrollRun.js';
import salaryCalculationService from './salaryCalculationService.js';
import documentNumberingService from './documentNumberingService.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';
import { withTransaction } from '../shared/utils/transaction.js';

export class PayrollRunService {
  async computePayroll(tenantId: string, month: string): Promise<any> {
    return withTransaction(async (session) => {
      const tid = new mongoose.Types.ObjectId(tenantId);
      const existing = await PayrollRun.findOne({ tenant_id: tid, month }).session(session);
      if (existing && (existing as any).status !== 'draft') throw new ConflictError('Payroll already processed for ' + month);
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      const employees = await db.collection('employees').find({ tenant_id: tid, status: { $ne: 'inactive' } }, { session }).toArray();
      const payslips: any[] = [];
      let totalGross = 0, totalDeductions = 0, totalNet = 0;
      for (const emp of employees) {
        try {
          const salary = await salaryCalculationService.calculateSalary(tenantId, emp._id.toString(), month);
          const psNumber = await documentNumberingService.getNextNumber(tenantId, 'payslip', session);
          const payslip = { ...salary, tenant_id: tid, payslip_number: psNumber, employee_id: emp._id, employee_name: emp.name, pay_month: month, status: 'computed', created_at: new Date(), updated_at: new Date() };
          payslips.push(payslip);
          totalGross += salary.gross; totalDeductions += salary.total_deductions; totalNet += salary.net_pay;
        } catch (e: any) { console.error('Payroll calc failed for ' + emp.name + ': ' + e.message); }
      }
      if (payslips.length) await db.collection('payslips').insertMany(payslips, { session });
      const payslipIds = payslips.map(p => p.payslip_number);
      if (existing) {
        (existing as any).status = 'computed'; (existing as any).payslip_ids = payslipIds;
        (existing as any).total_gross = totalGross; (existing as any).total_deductions = totalDeductions; (existing as any).total_net = totalNet;
        (existing as any).employee_count = payslips.length; await existing.save({ session });
        return existing;
      }
      const [run] = await PayrollRun.create([{ tenant_id: tid, month, status: 'computed', payslip_ids: payslipIds, total_gross: totalGross, total_deductions: totalDeductions, total_net: totalNet, employee_count: payslips.length }], { session });
      return run;
    });
  }

  async approvePayroll(tenantId: string, runId: string): Promise<any> {
    const run: any = await PayrollRun.findOne({ _id: runId, tenant_id: new mongoose.Types.ObjectId(tenantId) });
    if (!run) throw new NotFoundError('Payroll run');
    if (run.status !== 'computed') throw new ValidationError('Payroll must be computed first');
    run.status = 'approved'; run.approved_at = new Date(); await run.save();
    return run;
  }

  async markPaid(tenantId: string, runId: string): Promise<any> {
    return withTransaction(async (session) => {
      const run: any = await PayrollRun.findOne({ _id: runId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!run) throw new NotFoundError('Payroll run');
      if (run.status !== 'approved') throw new ValidationError('Payroll must be approved first');
      run.status = 'paid'; run.paid_at = new Date(); await run.save({ session });
      const jeNumber = await documentNumberingService.getNextNumber(tenantId, 'journal_entry', session);
      const db = mongoose.connection.db;
      await db?.collection('journal_entries').insertOne({ tenant_id: new mongoose.Types.ObjectId(tenantId), entry_number: jeNumber, date: new Date(), description: 'Payroll: ' + run.month, lines: [{ account_type: 'salary_expense', debit: run.total_gross, credit: 0 }, { account_type: 'pf_payable', debit: 0, credit: Math.round(run.total_deductions * 0.3) }, { account_type: 'tax_payable', debit: 0, credit: Math.round(run.total_deductions * 0.7) }, { account_type: 'bank', debit: 0, credit: run.total_net }], source_type: 'payroll', source_id: run._id, status: 'posted', created_at: new Date(), updated_at: new Date() }, { session });
      return run;
    });
  }
}
export const payrollRunService = new PayrollRunService();
export default payrollRunService;

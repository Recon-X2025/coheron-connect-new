import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class BudgetService {
  async getBudgetVsActual(tenantId: string, budgetId: string): Promise<any> {
    const budget: any = await Budget.findOne({ _id: budgetId, tenant_id: new mongoose.Types.ObjectId(tenantId) });
    if (!budget) throw new NotFoundError('Budget');
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const results: any[] = [];
    for (const line of budget.lines || []) {
      const entries = await db.collection('journal_entries').aggregate([
        { $match: { tenant_id: tid, status: 'posted', 'lines.account_id': line.account_id?.toString() } },
        { $unwind: '$lines' },
        { $match: { 'lines.account_id': line.account_id?.toString() } },
        { $group: { _id: null, total_debit: { $sum: '$lines.debit' }, total_credit: { $sum: '$lines.credit' } } },
      ]).toArray();
      const actual = entries[0] ? (entries[0].total_debit - entries[0].total_credit) : 0;
      results.push({ account_id: line.account_id, period: line.period, budgeted: line.budgeted_amount, actual: Math.round(actual * 100) / 100, variance: Math.round((line.budgeted_amount - actual) * 100) / 100, utilization_percent: line.budgeted_amount > 0 ? Math.round((actual / line.budgeted_amount) * 10000) / 100 : 0 });
    }
    return { budget_id: budgetId, fiscal_year_id: budget.fiscal_year_id, lines: results };
  }
}
export const budgetService = new BudgetService();
export default budgetService;

import mongoose from 'mongoose';
import documentNumberingService from './documentNumberingService.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class FiscalYearService {
  async closePeriod(tenantId: string, periodId: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    await db.collection('fiscal_periods').updateOne({ _id: new mongoose.Types.ObjectId(periodId), tenant_id: new mongoose.Types.ObjectId(tenantId) }, { $set: { status: 'closed', closed_at: new Date() } });
  }

  async closeYear(tenantId: string, fiscalYearId: string): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    // Aggregate revenue and expense from journal entries for this fiscal year
    const fy = await db.collection('fiscal_years').findOne({ _id: new mongoose.Types.ObjectId(fiscalYearId), tenant_id: tid });
    if (!fy) throw new NotFoundError('Fiscal year');
    const entries = await db.collection('journal_entries').find({ tenant_id: tid, date: { $gte: new Date(fy.start_date), $lte: new Date(fy.end_date) }, status: 'posted' }).toArray();
    let totalRevenue = 0, totalExpense = 0;
    for (const entry of entries) {
      for (const line of entry.lines || []) {
        if (line.account_type === 'revenue') totalRevenue += (line.credit || 0) - (line.debit || 0);
        if (['expense','salary_expense','cogs'].includes(line.account_type)) totalExpense += (line.debit || 0) - (line.credit || 0);
      }
    }
    const netIncome = totalRevenue - totalExpense;
    // Create closing journal entry
    const jeNumber = await documentNumberingService.getNextNumber(tenantId, 'journal_entry');
    const closingEntry = { tenant_id: tid, entry_number: jeNumber, date: new Date(fy.end_date), description: 'Year-end closing entry', lines: [{ account_type: 'revenue', debit: totalRevenue, credit: 0, description: 'Close revenue' }, { account_type: 'expense', debit: 0, credit: totalExpense, description: 'Close expenses' }, { account_type: 'retained_earnings', debit: netIncome < 0 ? Math.abs(netIncome) : 0, credit: netIncome >= 0 ? netIncome : 0, description: 'Net income to retained earnings' }], source_type: 'year_close', source_id: new mongoose.Types.ObjectId(fiscalYearId), status: 'posted', created_at: new Date(), updated_at: new Date() };
    await db.collection('journal_entries').insertOne(closingEntry);
    await db.collection('fiscal_years').updateOne({ _id: new mongoose.Types.ObjectId(fiscalYearId) }, { $set: { status: 'closed', closed_at: new Date() } });
    await documentNumberingService.resetForFiscalYear(tenantId, fiscalYearId);
    return { net_income: netIncome, total_revenue: totalRevenue, total_expense: totalExpense, closing_entry: jeNumber };
  }
}
export const fiscalYearService = new FiscalYearService();
export default fiscalYearService;

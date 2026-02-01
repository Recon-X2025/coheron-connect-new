import mongoose from 'mongoose';
import { withTransaction } from '../shared/utils/transaction.js';

interface BankStatementLine { date: string; description: string; reference?: string; debit: number; credit: number; balance?: number; }

export class BankReconciliationService {
  async importBankStatement(tenantId: string, bankAccountId: string, lines: BankStatementLine[]): Promise<any> {
    return withTransaction(async (session) => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      const tid = new mongoose.Types.ObjectId(tenantId);
      const docs = lines.map(l => ({ tenant_id: tid, bank_account_id: new mongoose.Types.ObjectId(bankAccountId), date: new Date(l.date), description: l.description, reference: l.reference || '', debit: l.debit || 0, credit: l.credit || 0, balance: l.balance || 0, status: 'unmatched' as const, matched_entry_id: null, created_at: new Date(), updated_at: new Date() }));
      const result = await db.collection('bank_statement_lines').insertMany(docs, { session });
      return { imported: result.insertedCount };
    });
  }

  async autoMatch(tenantId: string, bankAccountId: string): Promise<{ matched: number; unmatched: number }> {
    return withTransaction(async (session) => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      const tid = new mongoose.Types.ObjectId(tenantId);
      const unmatched = await db.collection('bank_statement_lines').find({ tenant_id: tid, bank_account_id: new mongoose.Types.ObjectId(bankAccountId), status: 'unmatched' }, { session }).toArray();
      let matchedCount = 0;
      for (const line of unmatched) {
        const amount = line.debit || line.credit;
        // Match by amount + reference
        const je = await db.collection('journal_entries').findOne({ tenant_id: tid, status: 'posted', 'lines.debit': amount, $or: [{ description: { $regex: line.reference || '___nomatch___', $options: 'i' } }, { entry_number: line.reference }] }, { session });
        if (je) {
          await db.collection('bank_statement_lines').updateOne({ _id: line._id }, { $set: { status: 'matched', matched_entry_id: je._id, updated_at: new Date() } }, { session });
          matchedCount++;
          continue;
        }
        // Match by amount + date (within 2 days)
        const dateMatch = await db.collection('journal_entries').findOne({ tenant_id: tid, status: 'posted', 'lines.debit': amount, date: { $gte: new Date(new Date(line.date).getTime() - 2*86400000), $lte: new Date(new Date(line.date).getTime() + 2*86400000) } }, { session });
        if (dateMatch) {
          await db.collection('bank_statement_lines').updateOne({ _id: line._id }, { $set: { status: 'matched', matched_entry_id: dateMatch._id, updated_at: new Date() } }, { session });
          matchedCount++;
        }
      }
      return { matched: matchedCount, unmatched: unmatched.length - matchedCount };
    });
  }

  async reconcileLine(tenantId: string, lineId: string, journalEntryId: string): Promise<void> {
    const db = mongoose.connection.db;
    await db?.collection('bank_statement_lines').updateOne({ _id: new mongoose.Types.ObjectId(lineId), tenant_id: new mongoose.Types.ObjectId(tenantId) }, { $set: { status: 'reconciled', matched_entry_id: new mongoose.Types.ObjectId(journalEntryId), updated_at: new Date() } });
  }
}
export const bankReconciliationService = new BankReconciliationService();
export default bankReconciliationService;

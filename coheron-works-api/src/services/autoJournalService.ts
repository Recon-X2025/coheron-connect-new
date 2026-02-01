import mongoose from 'mongoose';
import documentNumberingService from './documentNumberingService.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class AutoJournalService {
  private async createJournal(tenantId: string, description: string, lines: any[], sourceType: string, sourceId: string): Promise<any> {
    const jeNumber = await documentNumberingService.getNextNumber(tenantId, 'journal_entry');
    const db = mongoose.connection.db;
    const entry = { tenant_id: new mongoose.Types.ObjectId(tenantId), entry_number: jeNumber, date: new Date(), description, lines, source_type: sourceType, source_id: new mongoose.Types.ObjectId(sourceId), status: 'posted', created_at: new Date(), updated_at: new Date() };
    await db?.collection('journal_entries').insertOne(entry);
    return entry;
  }

  async createInvoiceJournal(tenantId: string, invoiceId: string, amount: number, taxAmount: number, partnerId: string): Promise<any> {
    return this.createJournal(tenantId, 'Invoice posted', [
      { account_type: 'accounts_receivable', partner_id: partnerId, debit: amount + taxAmount, credit: 0 },
      { account_type: 'revenue', debit: 0, credit: amount },
      { account_type: 'tax_payable', debit: 0, credit: taxAmount },
    ], 'invoice', invoiceId);
  }

  async createPaymentJournal(tenantId: string, paymentId: string, amount: number, partnerId: string): Promise<any> {
    return this.createJournal(tenantId, 'Payment received', [
      { account_type: 'bank', debit: amount, credit: 0 },
      { account_type: 'accounts_receivable', partner_id: partnerId, debit: 0, credit: amount },
    ], 'payment', paymentId);
  }

  async createPurchaseJournal(tenantId: string, billId: string, amount: number, taxAmount: number, vendorId: string): Promise<any> {
    return this.createJournal(tenantId, 'Vendor bill posted', [
      { account_type: 'expense', debit: amount, credit: 0 },
      { account_type: 'tax_receivable', debit: taxAmount, credit: 0 },
      { account_type: 'accounts_payable', partner_id: vendorId, debit: 0, credit: amount + taxAmount },
    ], 'vendor_bill', billId);
  }

  async createInventoryJournal(tenantId: string, deliveryId: string, cogsCost: number): Promise<any> {
    return this.createJournal(tenantId, 'COGS on delivery', [
      { account_type: 'cogs', debit: cogsCost, credit: 0 },
      { account_type: 'inventory', debit: 0, credit: cogsCost },
    ], 'delivery', deliveryId);
  }
}
export const autoJournalService = new AutoJournalService();
export default autoJournalService;

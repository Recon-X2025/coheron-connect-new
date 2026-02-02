import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import documentNumberingService from './documentNumberingService.js';
import creditLimitService from './creditLimitService.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';
import { withTransaction } from '../shared/utils/transaction.js';
import { eventBus } from '../orchestration/EventBus.js';
import { PAYMENT_RECORDED, CREDITNOTE_CREATED } from '../orchestration/events.js';

export class PaymentRecordingService {
  async recordPayment(tenantId: string, invoiceId: string, amount: number, paymentMethod: string, reference?: string, date?: Date): Promise<any> {
    return withTransaction(async (session) => {
      const invoice: any = await Invoice.findOne({ _id: invoiceId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!invoice) throw new NotFoundError('Invoice');
      const residual = (invoice.amount_total || 0) - (invoice.amount_paid || 0);
      if (amount > residual) throw new ValidationError('Payment exceeds residual: ' + residual);
      const paymentNumber = await documentNumberingService.getNextNumber(tenantId, 'payment', session);
      const payments = invoice.payments || [];
      payments.push({ payment_number: paymentNumber, amount, method: paymentMethod, reference: reference || '', date: date || new Date() });
      const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
      const newStatus = totalPaid >= (invoice.amount_total || 0) ? 'paid' : 'partial';
      await Invoice.updateOne({ _id: invoiceId }, { $set: { payments, amount_paid: totalPaid, payment_state: newStatus, state: totalPaid >= invoice.amount_total ? 'paid' : invoice.state } }, { session });
      if (invoice.partner_id) await creditLimitService.releaseCreditUsed(tenantId, invoice.partner_id.toString(), amount, session);
      const jeNumber = await documentNumberingService.getNextNumber(tenantId, 'journal_entry', session);
      const db = mongoose.connection.db;
      await db?.collection('journal_entries').insertOne({ tenant_id: new mongoose.Types.ObjectId(tenantId), entry_number: jeNumber, date: date || new Date(), description: 'Payment: ' + paymentNumber, lines: [{ account_type: 'bank', debit: amount, credit: 0 }, { account_type: 'accounts_receivable', debit: 0, credit: amount }], source_type: 'payment', source_id: invoiceId, status: 'posted', created_at: new Date(), updated_at: new Date() }, { session });
      eventBus.publish(PAYMENT_RECORDED, tenantId, {
        invoice_id: invoiceId,
        payment_number: paymentNumber,
        amount,
        partner_id: invoice.partner_id?.toString(),
        total_paid: totalPaid,
        status: newStatus,
      }, { source: 'paymentRecordingService' });

      return { payment_number: paymentNumber, amount, total_paid: totalPaid, status: newStatus };
    });
  }

  async createCreditNote(tenantId: string, invoiceId: string, amount: number, reason: string, userId: string): Promise<any> {
    return withTransaction(async (session) => {
      const invoice: any = await Invoice.findOne({ _id: invoiceId, tenant_id: new mongoose.Types.ObjectId(tenantId) }).session(session);
      if (!invoice) throw new NotFoundError('Invoice');
      const cnNumber = await documentNumberingService.getNextNumber(tenantId, 'credit_note', session);
      const db = mongoose.connection.db;
      await db?.collection('credit_notes').insertOne({ tenant_id: new mongoose.Types.ObjectId(tenantId), credit_note_number: cnNumber, original_invoice_id: invoice._id, partner_id: invoice.partner_id, amount, reason, date: new Date(), status: 'draft', user_id: new mongoose.Types.ObjectId(userId), created_at: new Date(), updated_at: new Date() }, { session });
      eventBus.publish(CREDITNOTE_CREATED, tenantId, {
        invoice_id: invoiceId,
        credit_note_number: cnNumber,
        amount,
        partner_id: invoice.partner_id?.toString(),
      }, { user_id: userId, source: 'paymentRecordingService' });

      return { credit_note_number: cnNumber, amount };
    });
  }
}
export const paymentRecordingService = new PaymentRecordingService();
export default paymentRecordingService;

import DocumentSequence from '../models/DocumentSequence.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class DocumentNumberingService {
  /**
   * Get next document number using atomic findOneAndUpdate with $inc.
   * Thread-safe for concurrent requests.
   */
  async getNextNumber(tenantId: string, documentType: string, session?: mongoose.ClientSession): Promise<string> {
    const sequence = await DocumentSequence.findOneAndUpdate(
      { tenant_id: new mongoose.Types.ObjectId(tenantId), document_type: documentType, is_active: true },
      { $inc: { current_number: 1 } },
      { new: true, ...(session && { session }) }
    );

    if (!sequence) {
      throw new NotFoundError(`Active sequence for document type: ${documentType}. Please configure one in Settings`);
    }

    const numberStr = String(sequence.current_number).padStart(sequence.padding, '0');
    const parts: string[] = [];
    if (sequence.prefix) parts.push(sequence.prefix);
    parts.push(numberStr);
    if (sequence.suffix) parts.push(sequence.suffix);

    return parts.join('');
  }

  /**
   * Initialize default sequences for a tenant.
   */
  async initializeDefaults(tenantId: string): Promise<void> {
    const defaults = [
      { document_type: 'sale_order', prefix: 'SO-', padding: 5 },
      { document_type: 'invoice', prefix: 'INV-', padding: 5 },
      { document_type: 'quotation', prefix: 'QTN-', padding: 5 },
      { document_type: 'purchase_order', prefix: 'PO-', padding: 5 },
      { document_type: 'delivery_note', prefix: 'DN-', padding: 5 },
      { document_type: 'goods_receipt', prefix: 'GRN-', padding: 5 },
      { document_type: 'payment', prefix: 'PAY-', padding: 5 },
      { document_type: 'journal_entry', prefix: 'JE-', padding: 5 },
      { document_type: 'payslip', prefix: 'PS-', padding: 5 },
      { document_type: 'credit_note', prefix: 'CN-', padding: 5 },
      { document_type: 'debit_note', prefix: 'DBN-', padding: 5 },
    ];

    const ops = defaults.map(d => ({
      updateOne: {
        filter: { tenant_id: new mongoose.Types.ObjectId(tenantId), document_type: d.document_type },
        update: {
          $setOnInsert: {
            tenant_id: new mongoose.Types.ObjectId(tenantId),
            document_type: d.document_type,
            prefix: d.prefix,
            suffix: '',
            current_number: 0,
            padding: d.padding,
            reset_on_fiscal_year: false,
            is_active: true,
          }
        },
        upsert: true,
      }
    }));

    await DocumentSequence.bulkWrite(ops);
  }

  /**
   * Reset sequences for a new fiscal year.
   */
  async resetForFiscalYear(tenantId: string, fiscalYearId: string): Promise<void> {
    await DocumentSequence.updateMany(
      { tenant_id: new mongoose.Types.ObjectId(tenantId), reset_on_fiscal_year: true, is_active: true },
      { $set: { current_number: 0, fiscal_year_id: new mongoose.Types.ObjectId(fiscalYearId) } }
    );
  }
}

export const documentNumberingService = new DocumentNumberingService();
export default documentNumberingService;

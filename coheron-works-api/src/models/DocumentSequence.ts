import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IDocumentSequence extends Document {
  tenant_id: mongoose.Types.ObjectId;
  document_type: string;
  prefix: string;
  suffix: string;
  current_number: number;
  padding: number;
  fiscal_year_id: mongoose.Types.ObjectId | null;
  reset_on_fiscal_year: boolean;
  is_active: boolean;
}

const documentSequenceSchema = new Schema<IDocumentSequence>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  document_type: { type: String, required: true, enum: ['sale_order', 'invoice', 'quotation', 'purchase_order', 'delivery_note', 'grn', 'payment', 'journal_entry', 'payslip', 'credit_note', 'debit_note'] },
  prefix: { type: String, required: true },
  suffix: { type: String, default: '' },
  current_number: { type: Number, default: 0 },
  padding: { type: Number, default: 4 },
  fiscal_year_id: { type: Schema.Types.ObjectId, ref: 'FiscalYear', default: null },
  reset_on_fiscal_year: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

documentSequenceSchema.index({ tenant_id: 1, document_type: 1 }, { unique: true });

const DocumentSequenceModel = mongoose.model<IDocumentSequence>('DocumentSequence', documentSequenceSchema);
export { DocumentSequenceModel as DocumentSequence };
export default DocumentSequenceModel;

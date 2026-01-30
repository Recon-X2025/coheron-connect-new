import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IInvoice extends Document {
  name: string;
  partner_id: mongoose.Types.ObjectId;
  invoice_date: Date;
  due_date: Date | null;
  move_type: string;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
  state: string;
}

const InvoiceSchema = new Schema<IInvoice>({
  name: { type: String, required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  invoice_date: { type: Date, default: Date.now },
  due_date: { type: Date, default: null },
  move_type: { type: String, default: 'out_invoice' },
  amount_total: { type: Number, default: 0 },
  amount_residual: { type: Number, default: 0 },
  payment_state: { type: String, default: 'not_paid' },
  state: { type: String, default: 'draft' },
}, schemaOptions);

InvoiceSchema.index({ partner_id: 1 });
InvoiceSchema.index({ state: 1 });
InvoiceSchema.index({ payment_state: 1 });
InvoiceSchema.index({ due_date: -1 });
InvoiceSchema.index({ partner_id: 1, created_at: -1 });

const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export { InvoiceModel as Invoice };
export default InvoiceModel;

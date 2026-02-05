import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IReceiptInvoiceRel {
  invoice_id: mongoose.Types.ObjectId;
  amount: number;
}

const ReceiptInvoiceRelSchema = new Schema<IReceiptInvoiceRel>({
  invoice_id: { type: Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

export interface IAccountReceipt extends Document {
  name: string;
  customer_id: mongoose.Types.ObjectId;
  invoice_id: mongoose.Types.ObjectId | null;
  amount: number;
  currency_id: mongoose.Types.ObjectId | null;
  payment_date: Date;
  payment_method: string;
  journal_id: mongoose.Types.ObjectId | null;
  communication: string | null;
  state: string;
  invoice_allocations: IReceiptInvoiceRel[];
}

const AccountReceiptSchema = new Schema<IAccountReceipt>({
  name: { type: String, required: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'AccountCustomer', required: true },
  invoice_id: { type: Schema.Types.ObjectId, default: null },
  amount: { type: Number, required: true },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  payment_date: { type: Date, required: true },
  payment_method: { type: String, default: 'bank_transfer' },
  journal_id: { type: Schema.Types.ObjectId, ref: 'AccountJournal', default: null },
  communication: { type: String, default: null },
  state: { type: String, default: 'draft' },
  invoice_allocations: [ReceiptInvoiceRelSchema],
}, schemaOptions);

// Indexes
AccountReceiptSchema.index({ customer_id: 1 });
AccountReceiptSchema.index({ invoice_id: 1 });
AccountReceiptSchema.index({ journal_id: 1 });
AccountReceiptSchema.index({ state: 1 });
AccountReceiptSchema.index({ payment_date: -1 });
AccountReceiptSchema.index({ state: 1, payment_date: -1 });

export default mongoose.models.AccountReceipt as mongoose.Model<IAccountReceipt> || mongoose.model<IAccountReceipt>('AccountReceipt', AccountReceiptSchema);

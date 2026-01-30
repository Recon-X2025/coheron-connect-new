import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAccountBillLine {
  product_id: mongoose.Types.ObjectId | null;
  name: string;
  quantity: number;
  price_unit: number;
  price_subtotal: number;
  tax_ids: string[] | null;
  account_id: mongoose.Types.ObjectId | null;
  cost_center_id: mongoose.Types.ObjectId | null;
  project_id: mongoose.Types.ObjectId | null;
}

const AccountBillLineSchema = new Schema<IAccountBillLine>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  name: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  price_unit: { type: Number, default: 0 },
  price_subtotal: { type: Number, default: 0 },
  tax_ids: { type: [String], default: null },
  account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', default: null },
  cost_center_id: { type: Schema.Types.ObjectId, default: null },
  project_id: { type: Schema.Types.ObjectId, default: null },
}, { _id: true, toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } } });

export interface IAccountBill extends Document {
  name: string;
  vendor_id: mongoose.Types.ObjectId;
  invoice_date: Date;
  due_date: Date | null;
  reference: string | null;
  purchase_order_id: mongoose.Types.ObjectId | null;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  amount_residual: number;
  currency_id: mongoose.Types.ObjectId | null;
  state: string;
  payment_state: string;
  move_id: mongoose.Types.ObjectId | null;
  lines: IAccountBillLine[];
}

const AccountBillSchema = new Schema<IAccountBill>({
  name: { type: String, required: true },
  vendor_id: { type: Schema.Types.ObjectId, ref: 'AccountVendor', required: true },
  invoice_date: { type: Date, required: true },
  due_date: { type: Date, default: null },
  reference: { type: String, default: null },
  purchase_order_id: { type: Schema.Types.ObjectId, default: null },
  amount_untaxed: { type: Number, default: 0 },
  amount_tax: { type: Number, default: 0 },
  amount_total: { type: Number, default: 0 },
  amount_residual: { type: Number, default: 0 },
  currency_id: { type: Schema.Types.ObjectId, default: null },
  state: { type: String, default: 'draft' },
  payment_state: { type: String, default: 'not_paid' },
  move_id: { type: Schema.Types.ObjectId, ref: 'AccountMove', default: null },
  lines: [AccountBillLineSchema],
}, schemaOptions);

// Indexes
AccountBillSchema.index({ vendor_id: 1 });
AccountBillSchema.index({ purchase_order_id: 1 });
AccountBillSchema.index({ move_id: 1 });
AccountBillSchema.index({ state: 1 });
AccountBillSchema.index({ payment_state: 1 });
AccountBillSchema.index({ invoice_date: -1 });
AccountBillSchema.index({ due_date: 1 });
AccountBillSchema.index({ state: 1, invoice_date: -1 });
AccountBillSchema.index({ vendor_id: 1, state: 1 });

export default mongoose.model<IAccountBill>('AccountBill', AccountBillSchema);

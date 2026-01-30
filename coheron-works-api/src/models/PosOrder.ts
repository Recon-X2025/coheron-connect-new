import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IPosOrderLine {
  product_id: mongoose.Types.ObjectId;
  product_name?: string;
  product_code?: string;
  qty: number;
  price_unit: number;
  discount: number;
  tax_id: mongoose.Types.ObjectId;
}

export interface IPosOrder extends Document {
  name: string;
  order_number: string;
  store_id: mongoose.Types.ObjectId;
  terminal_id: mongoose.Types.ObjectId;
  session_id: mongoose.Types.ObjectId;
  partner_id: mongoose.Types.ObjectId;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_type: string;
  state: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  amount_discount: number;
  amount_paid: number;
  payment_method: string;
  payment_status: string;
  user_id: mongoose.Types.ObjectId;
  cashier_id: mongoose.Types.ObjectId;
  is_parked: boolean;
  is_void: boolean;
  void_reason: string;
  void_user_id: mongoose.Types.ObjectId;
  void_date: Date;
  paid_at: Date;
  lines: IPosOrderLine[];
}

const posOrderLineSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name: { type: String },
  product_code: { type: String },
  qty: { type: Number, required: true },
  price_unit: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax_id: { type: Schema.Types.ObjectId },
}, { _id: true });

const posOrderSchema = new Schema<IPosOrder>({
  name: { type: String },
  order_number: { type: String, unique: true },
  store_id: { type: Schema.Types.ObjectId, ref: 'Store' },
  terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal' },
  session_id: { type: Schema.Types.ObjectId, ref: 'PosSession' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  customer_name: { type: String },
  customer_phone: { type: String },
  customer_email: { type: String },
  order_type: { type: String, default: 'sale' },
  state: { type: String, default: 'draft' },
  amount_untaxed: { type: Number, default: 0 },
  amount_tax: { type: Number, default: 0 },
  amount_total: { type: Number, default: 0 },
  amount_discount: { type: Number, default: 0 },
  amount_paid: { type: Number, default: 0 },
  payment_method: { type: String },
  payment_status: { type: String, default: 'pending' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  cashier_id: { type: Schema.Types.ObjectId, ref: 'User' },
  is_parked: { type: Boolean, default: false },
  is_void: { type: Boolean, default: false },
  void_reason: { type: String },
  void_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  void_date: { type: Date },
  paid_at: { type: Date },
  lines: [posOrderLineSchema],
}, defaultSchemaOptions);

// Indexes
posOrderSchema.index({ store_id: 1 });
posOrderSchema.index({ terminal_id: 1 });
posOrderSchema.index({ session_id: 1 });
posOrderSchema.index({ partner_id: 1 });
posOrderSchema.index({ user_id: 1 });
posOrderSchema.index({ cashier_id: 1 });
posOrderSchema.index({ state: 1 });
posOrderSchema.index({ payment_status: 1 });
posOrderSchema.index({ created_at: -1 });
posOrderSchema.index({ state: 1, created_at: -1 });
posOrderSchema.index({ store_id: 1, state: 1 });
posOrderSchema.index({ session_id: 1, state: 1 });

export default mongoose.model<IPosOrder>('PosOrder', posOrderSchema);

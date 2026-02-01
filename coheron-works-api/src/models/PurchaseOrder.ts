import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

const poLineSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },
  hsn_code: { type: String },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  tax_id: { type: Schema.Types.ObjectId, ref: 'TaxRule' },
  taxable_amount: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  received_qty: { type: Number, default: 0 },
  billed_qty: { type: Number, default: 0 },
});

export interface IPurchaseOrder extends Document {
  tenant_id: mongoose.Types.ObjectId;
  po_number: string;
  vendor_id: mongoose.Types.ObjectId;
  date: Date;
  expected_delivery_date: Date | null;
  currency: string;
  exchange_rate: number;
  lines: any[];
  subtotal: number;
  total_tax: number;
  grand_total: number;
  tax_breakdown: Record<string, number>;
  state: string;
  grn_ids: mongoose.Types.ObjectId[];
  bill_ids: mongoose.Types.ObjectId[];
  notes: string;
  terms_conditions: string;
  approved_by: mongoose.Types.ObjectId | null;
  approved_at: Date | null;
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  po_number: { type: String, unique: true },
  vendor_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  date: { type: Date, default: Date.now },
  expected_delivery_date: { type: Date, default: null },
  currency: { type: String, default: 'INR' },
  exchange_rate: { type: Number, default: 1 },
  lines: [poLineSchema],
  subtotal: { type: Number, default: 0 },
  total_tax: { type: Number, default: 0 },
  grand_total: { type: Number, default: 0 },
  tax_breakdown: { type: Schema.Types.Mixed, default: {} },
  state: { type: String, default: 'draft', enum: ['draft', 'confirmed', 'partially_received', 'received', 'billed', 'cancelled'] },
  grn_ids: [{ type: Schema.Types.ObjectId, ref: 'StockGrn' }],
  bill_ids: [{ type: Schema.Types.ObjectId, ref: 'AccountBill' }],
  notes: { type: String, default: '' },
  terms_conditions: { type: String, default: '' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approved_at: { type: Date, default: null },
}, defaultSchemaOptions);

purchaseOrderSchema.index({ tenant_id: 1, state: 1 });
purchaseOrderSchema.index({ vendor_id: 1 });
purchaseOrderSchema.index({ date: -1 });

const PurchaseOrderModel = mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
export { PurchaseOrderModel as PurchaseOrder };
export default PurchaseOrderModel;

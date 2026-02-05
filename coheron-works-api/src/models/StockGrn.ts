import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockGrnLine {
  product_id: mongoose.Types.ObjectId;
  purchase_line_id: mongoose.Types.ObjectId;
  product_uom_id: mongoose.Types.ObjectId;
  ordered_qty: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  unit_price: number;
  landed_cost: number;
  qc_status: string;
  qc_remarks: string;
}

export interface IStockGrn extends Document {
  grn_number: string;
  partner_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  grn_date: Date;
  expected_date: Date;
  purchase_order_id: mongoose.Types.ObjectId;
  delivery_challan_number: string;
  supplier_invoice_number: string;
  qc_status: string;
  qc_inspector_id: mongoose.Types.ObjectId;
  qc_date: Date;
  qc_remarks: string;
  received_by: mongoose.Types.ObjectId;
  approved_by: mongoose.Types.ObjectId;
  state: string;
  notes: string;
  lines: IStockGrnLine[];
}

const stockGrnLineSchema = new Schema<IStockGrnLine>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  purchase_line_id: { type: Schema.Types.ObjectId },
  product_uom_id: { type: Schema.Types.ObjectId },
  ordered_qty: { type: Number, default: 0 },
  received_qty: { type: Number, default: 0 },
  accepted_qty: { type: Number, default: 0 },
  rejected_qty: { type: Number, default: 0 },
  unit_price: { type: Number, default: 0 },
  landed_cost: { type: Number, default: 0 },
  qc_status: { type: String, default: 'pending' },
  qc_remarks: { type: String },
}, { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const stockGrnSchema = new Schema<IStockGrn>({
  grn_number: { type: String, required: true, unique: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  grn_date: { type: Date, default: Date.now },
  expected_date: { type: Date },
  purchase_order_id: { type: Schema.Types.ObjectId },
  delivery_challan_number: { type: String },
  supplier_invoice_number: { type: String },
  qc_status: { type: String },
  qc_inspector_id: { type: Schema.Types.ObjectId, ref: 'User' },
  qc_date: { type: Date },
  qc_remarks: { type: String },
  received_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  state: { type: String, default: 'draft' },
  notes: { type: String },
  lines: [stockGrnLineSchema],
}, defaultSchemaOptions);

stockGrnSchema.index({ state: 1 });
stockGrnSchema.index({ grn_date: -1 });
stockGrnSchema.index({ partner_id: 1 });
stockGrnSchema.index({ warehouse_id: 1 });
stockGrnSchema.index({ purchase_order_id: 1 });
stockGrnSchema.index({ qc_status: 1 });
stockGrnSchema.index({ state: 1, grn_date: -1 });

export default mongoose.models.StockGrn as mongoose.Model<IStockGrn> || mongoose.model<IStockGrn>('StockGrn', stockGrnSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IStockReturnLine {
  product_id: mongoose.Types.ObjectId;
  product_uom_id: mongoose.Types.ObjectId;
  quantity: number;
  reason_code: string;
  lot_id: mongoose.Types.ObjectId;
}

export interface IStockReturn extends Document {
  return_number: string;
  return_type: string;
  original_transaction_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  return_date: Date;
  returned_by: mongoose.Types.ObjectId;
  approved_by: mongoose.Types.ObjectId;
  qc_status: string;
  state: string;
  notes: string;
  lines: IStockReturnLine[];
}

const stockReturnLineSchema = new Schema<IStockReturnLine>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  product_uom_id: { type: Schema.Types.ObjectId },
  quantity: { type: Number, required: true },
  reason_code: { type: String },
  lot_id: { type: Schema.Types.ObjectId, ref: 'StockProductionLot' },
}, { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const stockReturnSchema = new Schema<IStockReturn>({
  return_number: { type: String, required: true, unique: true },
  return_type: { type: String },
  original_transaction_id: { type: Schema.Types.ObjectId },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  return_date: { type: Date, default: Date.now },
  returned_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  qc_status: { type: String },
  state: { type: String, default: 'draft' },
  notes: { type: String },
  lines: [stockReturnLineSchema],
}, defaultSchemaOptions);

stockReturnSchema.index({ return_number: 1 }, { unique: true });
stockReturnSchema.index({ state: 1 });
stockReturnSchema.index({ return_date: -1 });
stockReturnSchema.index({ warehouse_id: 1 });
stockReturnSchema.index({ original_transaction_id: 1 });
stockReturnSchema.index({ return_type: 1 });
stockReturnSchema.index({ qc_status: 1 });
stockReturnSchema.index({ state: 1, return_date: -1 });

export default mongoose.model<IStockReturn>('StockReturn', stockReturnSchema);

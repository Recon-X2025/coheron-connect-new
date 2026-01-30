import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockAdjustmentLine {
  product_id: mongoose.Types.ObjectId;
  product_uom_id: mongoose.Types.ObjectId;
  system_qty: number;
  physical_qty: number;
  adjustment_qty: number;
  lot_id: mongoose.Types.ObjectId;
  unit_cost: number;
  adjustment_value: number;
  reason_code: string;
}

export interface IStockAdjustment extends Document {
  adjustment_number: string;
  warehouse_id: mongoose.Types.ObjectId;
  location_id: mongoose.Types.ObjectId;
  adjustment_date: Date;
  adjustment_type: string;
  reason_code: string;
  reason_description: string;
  adjusted_by: mongoose.Types.ObjectId;
  approved_by: mongoose.Types.ObjectId;
  total_value: number;
  state: string;
  notes: string;
  lines: IStockAdjustmentLine[];
}

const stockAdjustmentLineSchema = new Schema<IStockAdjustmentLine>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  product_uom_id: { type: Schema.Types.ObjectId },
  system_qty: { type: Number, default: 0 },
  physical_qty: { type: Number, default: 0 },
  adjustment_qty: { type: Number, default: 0 },
  lot_id: { type: Schema.Types.ObjectId, ref: 'StockProductionLot' },
  unit_cost: { type: Number, default: 0 },
  adjustment_value: { type: Number, default: 0 },
  reason_code: { type: String },
}, { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const stockAdjustmentSchema = new Schema<IStockAdjustment>({
  adjustment_number: { type: String, required: true, unique: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  location_id: { type: Schema.Types.ObjectId, ref: 'StockLocation' },
  adjustment_date: { type: Date, default: Date.now },
  adjustment_type: { type: String },
  reason_code: { type: String },
  reason_description: { type: String },
  adjusted_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  total_value: { type: Number, default: 0 },
  state: { type: String, default: 'draft' },
  notes: { type: String },
  lines: [stockAdjustmentLineSchema],
}, defaultSchemaOptions);

stockAdjustmentSchema.index({ adjustment_number: 1 }, { unique: true });
stockAdjustmentSchema.index({ state: 1 });
stockAdjustmentSchema.index({ adjustment_date: -1 });
stockAdjustmentSchema.index({ warehouse_id: 1 });
stockAdjustmentSchema.index({ location_id: 1 });
stockAdjustmentSchema.index({ state: 1, adjustment_date: -1 });

export default mongoose.model<IStockAdjustment>('StockAdjustment', stockAdjustmentSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockTransferLine {
  product_id: mongoose.Types.ObjectId;
  product_uom_id: mongoose.Types.ObjectId;
  quantity: number;
  lot_id: mongoose.Types.ObjectId;
  unit_cost: number;
}

export interface IStockTransfer extends Document {
  transfer_number: string;
  from_warehouse_id: mongoose.Types.ObjectId;
  to_warehouse_id: mongoose.Types.ObjectId;
  from_location_id: mongoose.Types.ObjectId;
  to_location_id: mongoose.Types.ObjectId;
  transfer_date: Date;
  expected_delivery_date: Date;
  transfer_type: string;
  initiated_by: mongoose.Types.ObjectId;
  received_by: mongoose.Types.ObjectId;
  state: string;
  notes: string;
  lines: IStockTransferLine[];
}

const stockTransferLineSchema = new Schema<IStockTransferLine>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  product_uom_id: { type: Schema.Types.ObjectId },
  quantity: { type: Number, required: true },
  lot_id: { type: Schema.Types.ObjectId, ref: 'StockProductionLot' },
  unit_cost: { type: Number, default: 0 },
}, { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const stockTransferSchema = new Schema<IStockTransfer>({
  transfer_number: { type: String, required: true, unique: true },
  from_warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  to_warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  from_location_id: { type: Schema.Types.ObjectId, ref: 'StockLocation' },
  to_location_id: { type: Schema.Types.ObjectId, ref: 'StockLocation' },
  transfer_date: { type: Date, default: Date.now },
  expected_delivery_date: { type: Date },
  transfer_type: { type: String, default: 'warehouse_to_warehouse' },
  initiated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  received_by: { type: Schema.Types.ObjectId, ref: 'User' },
  state: { type: String, default: 'draft' },
  notes: { type: String },
  lines: [stockTransferLineSchema],
}, defaultSchemaOptions);

stockTransferSchema.index({ transfer_number: 1 }, { unique: true });
stockTransferSchema.index({ state: 1 });
stockTransferSchema.index({ transfer_date: -1 });
stockTransferSchema.index({ from_warehouse_id: 1 });
stockTransferSchema.index({ to_warehouse_id: 1 });
stockTransferSchema.index({ from_location_id: 1 });
stockTransferSchema.index({ to_location_id: 1 });
stockTransferSchema.index({ state: 1, transfer_date: -1 });

export default mongoose.model<IStockTransfer>('StockTransfer', stockTransferSchema);

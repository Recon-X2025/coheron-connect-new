import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockMoveLine extends Document {
  tenant_id: string;
  stock_move_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  serial_number_id?: mongoose.Types.ObjectId;
  batch_id?: mongoose.Types.ObjectId;
  quantity: number;
  from_warehouse_id?: mongoose.Types.ObjectId;
  to_warehouse_id?: mongoose.Types.ObjectId;
  from_bin?: string;
  to_bin?: string;
  created_at: Date;
}

const stockMoveLineSchema = new Schema<IStockMoveLine>({
  tenant_id: { type: String, required: true },
  stock_move_id: { type: Schema.Types.ObjectId, ref: 'StockTransfer', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  serial_number_id: { type: Schema.Types.ObjectId, ref: 'SerialNumber' },
  batch_id: { type: Schema.Types.ObjectId, ref: 'Batch' },
  quantity: { type: Number, required: true },
  from_warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  to_warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  from_bin: { type: String },
  to_bin: { type: String },
}, defaultSchemaOptions);

stockMoveLineSchema.index({ tenant_id: 1, stock_move_id: 1 });
stockMoveLineSchema.index({ serial_number_id: 1 });
stockMoveLineSchema.index({ batch_id: 1 });

export default mongoose.model<IStockMoveLine>('StockMoveLine', stockMoveLineSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IPutawayTask extends Document {
  grn_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  suggested_location: string;
  actual_location: string;
  quantity: number;
  state: string;
  started_at: Date;
  completed_at: Date;
  putaway_time_minutes: number;
}

const putawayTaskSchema = new Schema<IPutawayTask>({
  grn_id: { type: Schema.Types.ObjectId, ref: 'StockGrn' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  suggested_location: { type: String },
  actual_location: { type: String },
  quantity: { type: Number, default: 0 },
  state: { type: String, default: 'pending' },
  started_at: { type: Date },
  completed_at: { type: Date },
  putaway_time_minutes: { type: Number, default: 0 },
}, defaultSchemaOptions);

putawayTaskSchema.index({ state: 1 });
putawayTaskSchema.index({ warehouse_id: 1 });
putawayTaskSchema.index({ grn_id: 1 });
putawayTaskSchema.index({ product_id: 1 });
putawayTaskSchema.index({ created_at: -1 });
putawayTaskSchema.index({ warehouse_id: 1, state: 1 });

export default mongoose.model<IPutawayTask>('PutawayTask', putawayTaskSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IPickingTask extends Document {
  product_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  location: string;
  quantity_requested: number;
  quantity_picked: number;
  state: string;
  started_at: Date;
  completed_at: Date;
  picking_time_minutes: number;
}

const pickingTaskSchema = new Schema<IPickingTask>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  location: { type: String },
  quantity_requested: { type: Number, default: 0 },
  quantity_picked: { type: Number, default: 0 },
  state: { type: String, default: 'pending' },
  started_at: { type: Date },
  completed_at: { type: Date },
  picking_time_minutes: { type: Number, default: 0 },
}, defaultSchemaOptions);

pickingTaskSchema.index({ state: 1 });
pickingTaskSchema.index({ warehouse_id: 1 });
pickingTaskSchema.index({ product_id: 1 });
pickingTaskSchema.index({ created_at: -1 });
pickingTaskSchema.index({ warehouse_id: 1, state: 1 });

export default mongoose.models.PickingTask as mongoose.Model<IPickingTask> || mongoose.model<IPickingTask>('PickingTask', pickingTaskSchema);

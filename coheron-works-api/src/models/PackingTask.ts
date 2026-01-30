import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IPackingTask extends Document {
  order_id: mongoose.Types.ObjectId;
  state: string;
  packing_type: string;
  notes: string;
}

const packingTaskSchema = new Schema<IPackingTask>({
  order_id: { type: Schema.Types.ObjectId },
  state: { type: String, default: 'pending' },
  packing_type: { type: String },
  notes: { type: String },
}, defaultSchemaOptions);

packingTaskSchema.index({ state: 1 });
packingTaskSchema.index({ order_id: 1 });
packingTaskSchema.index({ created_at: -1 });

export default mongoose.model<IPackingTask>('PackingTask', packingTaskSchema);

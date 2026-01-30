import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface ICycleCount extends Document {
  warehouse_id: mongoose.Types.ObjectId;
  state: string;
  count_date: Date;
  notes: string;
}

const cycleCountSchema = new Schema<ICycleCount>({
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  state: { type: String, default: 'pending' },
  count_date: { type: Date },
  notes: { type: String },
}, defaultSchemaOptions);

cycleCountSchema.index({ state: 1 });
cycleCountSchema.index({ warehouse_id: 1 });
cycleCountSchema.index({ count_date: -1 });
cycleCountSchema.index({ warehouse_id: 1, state: 1 });

export default mongoose.model<ICycleCount>('CycleCount', cycleCountSchema);

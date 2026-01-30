import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoCosting extends Document {
  mo_id: mongoose.Types.ObjectId;
  cost_type: string;
  standard_cost: number;
  actual_cost: number;
  variance: number;
  variance_percent: number;
}

const schema = new Schema<IMoCosting>({
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  cost_type: { type: String, required: true },
  standard_cost: { type: Number, default: 0 },
  actual_cost: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  variance_percent: { type: Number, default: 0 },
}, defaultSchemaOptions);

schema.index({ mo_id: 1, cost_type: 1 }, { unique: true });
schema.index({ cost_type: 1 });

export default mongoose.model<IMoCosting>('MoCosting', schema);

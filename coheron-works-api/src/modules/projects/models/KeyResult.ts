import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IKeyResult extends Document {
  tenant_id: mongoose.Types.ObjectId;
  objective_id: mongoose.Types.ObjectId;
  title: string;
  metric_type: string;
  target_value: number;
  current_value: number;
  status: string;
  owner_id: mongoose.Types.ObjectId;
  weight: number;
}

const keyResultSchema = new Schema<IKeyResult>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  objective_id: { type: Schema.Types.ObjectId, ref: 'Objective', required: true },
  title: { type: String, required: true },
  metric_type: { type: String, enum: ['number', 'percentage', 'currency', 'boolean'], default: 'number' },
  target_value: { type: Number, required: true },
  current_value: { type: Number, default: 0 },
  status: { type: String, enum: ['not_started', 'on_track', 'at_risk', 'behind', 'completed'], default: 'not_started' },
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  weight: { type: Number, default: 1 },
}, defaultSchemaOptions);

keyResultSchema.index({ tenant_id: 1, objective_id: 1 });

export const KeyResult = mongoose.model<IKeyResult>('KeyResult', keyResultSchema);

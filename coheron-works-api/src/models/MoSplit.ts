import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IMoSplit extends Document {
  parent_mo_id: mongoose.Types.ObjectId;
  child_mo_id: mongoose.Types.ObjectId;
  split_qty: number;
  reason: string;
}

const schema = new Schema<IMoSplit>({
  parent_mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  child_mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  split_qty: { type: Number, required: true },
  reason: { type: String },
}, defaultSchemaOptions);

schema.index({ parent_mo_id: 1 });
schema.index({ child_mo_id: 1 });

export default mongoose.model<IMoSplit>('MoSplit', schema);

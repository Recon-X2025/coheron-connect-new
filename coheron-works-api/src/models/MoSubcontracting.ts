import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoSubcontracting extends Document {
  mo_id: mongoose.Types.ObjectId;
  cost: number;
  state: string;
}

const schema = new Schema<IMoSubcontracting>({
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  cost: { type: Number, default: 0 },
  state: { type: String, default: 'draft' },
}, defaultSchemaOptions);

schema.index({ mo_id: 1 });
schema.index({ state: 1 });
schema.index({ mo_id: 1, state: 1 });

export default mongoose.model<IMoSubcontracting>('MoSubcontracting', schema);

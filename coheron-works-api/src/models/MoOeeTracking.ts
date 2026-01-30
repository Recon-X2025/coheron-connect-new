import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IMoOeeTracking extends Document {
  workcenter_id: mongoose.Types.ObjectId;
  workorder_id: mongoose.Types.ObjectId;
  date_tracked: Date;
  availability_percent: number;
  performance_percent: number;
  quality_percent: number;
  oee_percent: number;
}

const schema = new Schema<IMoOeeTracking>({
  workcenter_id: { type: Schema.Types.ObjectId, ref: 'Workcenter' },
  workorder_id: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  date_tracked: { type: Date, default: Date.now },
  availability_percent: { type: Number, default: 0 },
  performance_percent: { type: Number, default: 0 },
  quality_percent: { type: Number, default: 0 },
  oee_percent: { type: Number, default: 0 },
}, defaultSchemaOptions);

schema.index({ workcenter_id: 1, date_tracked: -1 });
schema.index({ workorder_id: 1 });
schema.index({ date_tracked: -1 });

export default mongoose.model<IMoOeeTracking>('MoOeeTracking', schema);

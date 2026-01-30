import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoOperatorActivity extends Document {
  workorder_id: mongoose.Types.ObjectId;
  operator_id: mongoose.Types.ObjectId;
  activity_type: string;
  timestamp: Date;
  qty_produced: number;
  qty_scrapped: number;
  downtime_reason: string;
  downtime_duration: number;
  notes: string;
}

const schema = new Schema<IMoOperatorActivity>({
  workorder_id: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true },
  operator_id: { type: Schema.Types.ObjectId, ref: 'User' },
  activity_type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  qty_produced: { type: Number },
  qty_scrapped: { type: Number },
  downtime_reason: { type: String },
  downtime_duration: { type: Number },
  notes: { type: String },
}, defaultSchemaOptions);

schema.index({ workorder_id: 1, timestamp: -1 });
schema.index({ operator_id: 1 });
schema.index({ activity_type: 1 });
schema.index({ timestamp: -1 });

export default mongoose.model<IMoOperatorActivity>('MoOperatorActivity', schema);

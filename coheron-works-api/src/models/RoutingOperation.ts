import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IRoutingOperation extends Document {
  routing_id: mongoose.Types.ObjectId;
  name: string;
  sequence: number;
  workcenter_id: mongoose.Types.ObjectId;
  time_mode: string;
  time_cycle_manual: number;
  time_cycle: number;
  time_mode_batch: number;
  batch_size: number;
  time_start: number;
  time_stop: number;
  worksheet_type: string;
  note: string;
}

const routingOperationSchema = new Schema<IRoutingOperation>({
  routing_id: { type: Schema.Types.ObjectId, ref: 'Routing', required: true },
  name: { type: String, required: true },
  sequence: { type: Number, default: 0 },
  workcenter_id: { type: Schema.Types.ObjectId, ref: 'Workcenter' },
  time_mode: { type: String, default: 'auto' },
  time_cycle_manual: { type: Number },
  time_cycle: { type: Number },
  time_mode_batch: { type: Number, default: 1 },
  batch_size: { type: Number, default: 1 },
  time_start: { type: Number, default: 0 },
  time_stop: { type: Number, default: 0 },
  worksheet_type: { type: String },
  note: { type: String },
}, defaultSchemaOptions);

routingOperationSchema.index({ routing_id: 1, sequence: 1 });
routingOperationSchema.index({ workcenter_id: 1 });

export default mongoose.model<IRoutingOperation>('RoutingOperation', routingOperationSchema);

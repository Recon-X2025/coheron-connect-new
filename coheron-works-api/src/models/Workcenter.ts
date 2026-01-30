import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IWorkcenter extends Document {
  name: string;
  code: string;
  active: boolean;
  workcenter_type: string;
  capacity: number;
  time_efficiency: number;
  time_start: number;
  time_stop: number;
  costs_hour: number;
  costs_cycle: number;
  oee_target: number;
  location_id: mongoose.Types.ObjectId;
  resource_calendar_id: mongoose.Types.ObjectId;
  company_id: mongoose.Types.ObjectId;
  notes: string;
}

const workcenterSchema = new Schema<IWorkcenter>({
  name: { type: String, required: true },
  code: { type: String },
  active: { type: Boolean, default: true },
  workcenter_type: { type: String },
  capacity: { type: Number, default: 1 },
  time_efficiency: { type: Number, default: 100 },
  time_start: { type: Number, default: 0 },
  time_stop: { type: Number, default: 0 },
  costs_hour: { type: Number, default: 0 },
  costs_cycle: { type: Number, default: 0 },
  oee_target: { type: Number, default: 90 },
  location_id: { type: Schema.Types.ObjectId },
  resource_calendar_id: { type: Schema.Types.ObjectId },
  company_id: { type: Schema.Types.ObjectId },
  notes: { type: String },
}, defaultSchemaOptions);

workcenterSchema.index({ name: 1 });
workcenterSchema.index({ active: 1 });
workcenterSchema.index({ company_id: 1 });
workcenterSchema.index({ workcenter_type: 1 });

export default mongoose.model<IWorkcenter>('Workcenter', workcenterSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ISprint extends Document {
  project_id: mongoose.Types.ObjectId;
  name: string;
  goal?: string;
  start_date: Date;
  end_date: Date;
  state: string;
  velocity?: number;
  created_at: Date;
  updated_at: Date;
}

const sprintSchema = new Schema<ISprint>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  goal: { type: String },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  state: { type: String, default: 'future' },
  velocity: { type: Number },
}, defaultSchemaOptions);

// Sprint indexes
sprintSchema.index({ project_id: 1 });
sprintSchema.index({ state: 1 });
sprintSchema.index({ start_date: -1 });
sprintSchema.index({ project_id: 1, state: 1 });

export default mongoose.model<ISprint>('Sprint', sprintSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectResource extends Document {
  project_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role?: string;
  skill_level: string;
  allocation_percentage: number;
  cost_rate_per_hour: number;
  planned_hours: number;
  actual_hours: number;
  start_date?: Date;
  end_date?: Date;
  shift_type: string;
  created_at: Date;
  updated_at: Date;
}

const projectResourceSchema = new Schema<IProjectResource>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String },
  skill_level: { type: String, default: 'mid' },
  allocation_percentage: { type: Number, default: 100 },
  cost_rate_per_hour: { type: Number, default: 0 },
  planned_hours: { type: Number, default: 0 },
  actual_hours: { type: Number, default: 0 },
  start_date: { type: Date },
  end_date: { type: Date },
  shift_type: { type: String, default: 'day' },
}, defaultSchemaOptions);

projectResourceSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

// Indexes
projectResourceSchema.index({ user_id: 1 });
projectResourceSchema.index({ skill_level: 1 });
projectResourceSchema.index({ shift_type: 1 });
projectResourceSchema.index({ created_at: -1 });

export default mongoose.model<IProjectResource>('ProjectResource', projectResourceSchema);

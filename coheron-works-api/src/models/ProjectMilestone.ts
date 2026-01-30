import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProjectMilestone extends Document {
  project_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  planned_start_date?: Date;
  planned_end_date?: Date;
  actual_start_date?: Date;
  actual_end_date?: Date;
  status?: string;
  is_critical: boolean;
  created_at: Date;
  updated_at: Date;
}

const projectMilestoneSchema = new Schema<IProjectMilestone>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  description: { type: String },
  planned_start_date: { type: Date },
  planned_end_date: { type: Date },
  actual_start_date: { type: Date },
  actual_end_date: { type: Date },
  status: { type: String, default: 'pending' },
  is_critical: { type: Boolean, default: false },
}, defaultSchemaOptions);

// Indexes
projectMilestoneSchema.index({ project_id: 1 });
projectMilestoneSchema.index({ status: 1 });
projectMilestoneSchema.index({ project_id: 1, status: 1 });
projectMilestoneSchema.index({ planned_end_date: 1 });
projectMilestoneSchema.index({ created_at: -1 });

export default mongoose.model<IProjectMilestone>('ProjectMilestone', projectMilestoneSchema);

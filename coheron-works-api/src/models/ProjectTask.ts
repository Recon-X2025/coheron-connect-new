import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectTask extends Document {
  project_id: mongoose.Types.ObjectId;
  milestone_id?: mongoose.Types.ObjectId;
  parent_task_id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  assignee_id?: mongoose.Types.ObjectId;
  reporter_id?: mongoose.Types.ObjectId;
  planned_start_date?: Date;
  planned_end_date?: Date;
  actual_start_date?: Date;
  actual_end_date?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  story_points?: number;
  due_date?: Date;
  is_billable: boolean;
  created_at: Date;
  updated_at: Date;
}

const projectTaskSchema = new Schema<IProjectTask>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  milestone_id: { type: Schema.Types.ObjectId, ref: 'ProjectMilestone' },
  parent_task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  name: { type: String, required: true },
  description: { type: String },
  task_type: { type: String, default: 'task' },
  priority: { type: String, default: 'medium' },
  status: { type: String, default: 'backlog' },
  assignee_id: { type: Schema.Types.ObjectId, ref: 'User' },
  reporter_id: { type: Schema.Types.ObjectId, ref: 'User' },
  planned_start_date: { type: Date },
  planned_end_date: { type: Date },
  actual_start_date: { type: Date },
  actual_end_date: { type: Date },
  estimated_hours: { type: Number },
  actual_hours: { type: Number },
  story_points: { type: Number },
  due_date: { type: Date },
  is_billable: { type: Boolean, default: true },
}, defaultSchemaOptions);

projectTaskSchema.index({ project_id: 1 });
projectTaskSchema.index({ milestone_id: 1 });
projectTaskSchema.index({ assignee_id: 1 });
projectTaskSchema.index({ status: 1 });
projectTaskSchema.index({ due_date: -1 });
projectTaskSchema.index({ project_id: 1, status: 1 });
projectTaskSchema.index({ assignee_id: 1, status: 1 });

export default mongoose.model<IProjectTask>('ProjectTask', projectTaskSchema);

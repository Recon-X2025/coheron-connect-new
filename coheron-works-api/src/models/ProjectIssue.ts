import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProjectIssue extends Document {
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  severity: string;
  priority: string;
  status: string;
  reported_by?: mongoose.Types.ObjectId;
  assigned_to?: mongoose.Types.ObjectId;
  sla_deadline?: Date;
  resolution?: string;
  root_cause?: string;
  resolved_at?: Date;
  resolved_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const projectIssueSchema = new Schema<IProjectIssue>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  title: { type: String, required: true },
  description: { type: String },
  severity: { type: String, default: 'medium' },
  priority: { type: String, default: 'medium' },
  status: { type: String, default: 'open' },
  reported_by: { type: Schema.Types.ObjectId, ref: 'User' },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  sla_deadline: { type: Date },
  resolution: { type: String },
  root_cause: { type: String },
  resolved_at: { type: Date },
  resolved_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
projectIssueSchema.index({ project_id: 1 });
projectIssueSchema.index({ task_id: 1 });
projectIssueSchema.index({ status: 1 });
projectIssueSchema.index({ project_id: 1, status: 1 });
projectIssueSchema.index({ assigned_to: 1 });
projectIssueSchema.index({ reported_by: 1 });
projectIssueSchema.index({ severity: 1 });
projectIssueSchema.index({ priority: 1 });
projectIssueSchema.index({ resolved_by: 1 });
projectIssueSchema.index({ created_at: -1 });

export default mongoose.model<IProjectIssue>('ProjectIssue', projectIssueSchema);

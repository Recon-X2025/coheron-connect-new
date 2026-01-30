import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IIssue extends Document {
  project_id: mongoose.Types.ObjectId;
  issue_type_id: mongoose.Types.ObjectId;
  key: string;
  summary: string;
  description: string;
  priority: string;
  status: string;
  assignee_id: mongoose.Types.ObjectId;
  reporter_id: mongoose.Types.ObjectId;
  labels: string[];
  components: string[];
  fix_version: string;
  epic_id: mongoose.Types.ObjectId;
  due_date: Date;
  story_points: number;
  time_estimate: number;
  time_spent: number;
  resolution: string;
  resolved_at: Date;
}

const issueSchema = new Schema<IIssue>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  issue_type_id: { type: Schema.Types.ObjectId, ref: 'IssueType' },
  key: { type: String, unique: true },
  summary: { type: String, required: true },
  description: { type: String },
  priority: { type: String, default: 'medium' },
  status: { type: String, default: 'To Do' },
  assignee_id: { type: Schema.Types.ObjectId, ref: 'User' },
  reporter_id: { type: Schema.Types.ObjectId, ref: 'User' },
  labels: [{ type: String }],
  components: [{ type: String }],
  fix_version: { type: String },
  epic_id: { type: Schema.Types.ObjectId, ref: 'Epic' },
  due_date: { type: Date },
  story_points: { type: Number },
  time_estimate: { type: Number },
  time_spent: { type: Number },
  resolution: { type: String },
  resolved_at: { type: Date },
}, defaultSchemaOptions);

// Indexes
issueSchema.index({ project_id: 1 });
issueSchema.index({ issue_type_id: 1 });
issueSchema.index({ assignee_id: 1 });
issueSchema.index({ reporter_id: 1 });
issueSchema.index({ epic_id: 1 });
issueSchema.index({ status: 1 });
issueSchema.index({ priority: 1 });
issueSchema.index({ created_at: -1 });
issueSchema.index({ project_id: 1, status: 1 });
issueSchema.index({ project_id: 1, assignee_id: 1 });
issueSchema.index({ due_date: 1 });

export default mongoose.model<IIssue>('Issue', issueSchema);

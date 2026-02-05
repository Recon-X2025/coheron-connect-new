import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectApproval extends Document {
  project_id: mongoose.Types.ObjectId;
  approval_type: string;
  approver_id: mongoose.Types.ObjectId;
  comments?: string;
  status: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const projectApprovalSchema = new Schema<IProjectApproval>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  approval_type: { type: String, required: true },
  approver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comments: { type: String },
  status: { type: String, default: 'pending' },
  approved_at: { type: Date },
}, defaultSchemaOptions);

// Indexes
projectApprovalSchema.index({ project_id: 1 });
projectApprovalSchema.index({ approver_id: 1 });
projectApprovalSchema.index({ status: 1 });
projectApprovalSchema.index({ project_id: 1, status: 1 });
projectApprovalSchema.index({ approval_type: 1 });
projectApprovalSchema.index({ created_at: -1 });

export default mongoose.models.ProjectApproval as mongoose.Model<IProjectApproval> || mongoose.model<IProjectApproval>('ProjectApproval', projectApprovalSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IIssueHistory extends Document {
  issue_id: mongoose.Types.ObjectId;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_by: mongoose.Types.ObjectId;
}

const issueHistorySchema = new Schema<IIssueHistory>({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  field_name: { type: String },
  old_value: { type: String },
  new_value: { type: String },
  changed_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
issueHistorySchema.index({ issue_id: 1 });
issueHistorySchema.index({ changed_by: 1 });
issueHistorySchema.index({ issue_id: 1, created_at: -1 });

export default mongoose.models.IssueHistory as mongoose.Model<IIssueHistory> || mongoose.model<IIssueHistory>('IssueHistory', issueHistorySchema);

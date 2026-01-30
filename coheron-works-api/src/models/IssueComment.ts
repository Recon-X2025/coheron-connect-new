import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IIssueComment extends Document {
  issue_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  body: string;
}

const issueCommentSchema = new Schema<IIssueComment>({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
}, defaultSchemaOptions);

// Indexes
issueCommentSchema.index({ issue_id: 1 });
issueCommentSchema.index({ user_id: 1 });
issueCommentSchema.index({ issue_id: 1, created_at: -1 });

export default mongoose.model<IIssueComment>('IssueComment', issueCommentSchema);

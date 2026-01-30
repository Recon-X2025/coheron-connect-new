import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IIssueAttachment extends Document {
  issue_id: mongoose.Types.ObjectId;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: mongoose.Types.ObjectId;
}

const issueAttachmentSchema = new Schema<IIssueAttachment>({
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  filename: { type: String, required: true },
  file_path: { type: String, required: true },
  file_size: { type: Number },
  mime_type: { type: String },
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, defaultSchemaOptions);

// Indexes
issueAttachmentSchema.index({ issue_id: 1 });
issueAttachmentSchema.index({ uploaded_by: 1 });

export default mongoose.model<IIssueAttachment>('IssueAttachment', issueAttachmentSchema);

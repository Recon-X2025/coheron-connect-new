import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ITaskAttachment extends Document {
  task_id: mongoose.Types.ObjectId;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  uploaded_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const taskAttachmentSchema = new Schema<ITaskAttachment>({
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask', required: true },
  file_name: { type: String },
  file_url: { type: String },
  file_size: { type: Number },
  file_type: { type: String },
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
taskAttachmentSchema.index({ task_id: 1 });
taskAttachmentSchema.index({ uploaded_by: 1 });
taskAttachmentSchema.index({ created_at: -1 });

export default mongoose.models.TaskAttachment as mongoose.Model<ITaskAttachment> || mongoose.model<ITaskAttachment>('TaskAttachment', taskAttachmentSchema);

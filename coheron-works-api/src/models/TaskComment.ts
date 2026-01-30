import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ITaskComment extends Document {
  task_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  comment_text: string;
  parent_comment_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const taskCommentSchema = new Schema<ITaskComment>({
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  comment_text: { type: String, required: true },
  parent_comment_id: { type: Schema.Types.ObjectId, ref: 'TaskComment' },
}, defaultSchemaOptions);

// Indexes
taskCommentSchema.index({ task_id: 1 });
taskCommentSchema.index({ user_id: 1 });
taskCommentSchema.index({ parent_comment_id: 1 });
taskCommentSchema.index({ task_id: 1, created_at: -1 });
taskCommentSchema.index({ created_at: -1 });

export default mongoose.model<ITaskComment>('TaskComment', taskCommentSchema);

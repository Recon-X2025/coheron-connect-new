import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IForumReply extends Document {
  tenant_id: mongoose.Types.ObjectId;
  thread_id: mongoose.Types.ObjectId;
  body: string;
  author_id: mongoose.Types.ObjectId;
  is_solution: boolean;
  upvotes: number;
  downvotes: number;
  parent_reply_id?: mongoose.Types.ObjectId;
  status: 'active' | 'hidden' | 'spam';
}

const forumReplySchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  thread_id: { type: Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
  body: { type: String, required: true },
  author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  is_solution: { type: Boolean, default: false },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  parent_reply_id: { type: Schema.Types.ObjectId, ref: 'ForumReply' },
  status: { type: String, enum: ['active', 'hidden', 'spam'], default: 'active' },
}, defaultSchemaOptions);

forumReplySchema.index({ tenant_id: 1, thread_id: 1, created_at: 1 });

export const ForumReply = mongoose.model<IForumReply>('ForumReply', forumReplySchema);
export default ForumReply;

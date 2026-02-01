import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IForumThread extends Document {
  tenant_id: mongoose.Types.ObjectId;
  category_id: mongoose.Types.ObjectId;
  title: string;
  body: string;
  author_id: mongoose.Types.ObjectId;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  solved_reply_id?: mongoose.Types.ObjectId;
  views: number;
  reply_count: number;
  last_reply_at?: Date;
  tags: string[];
  status: 'active' | 'closed' | 'spam';
}

const forumThreadSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  category_id: { type: Schema.Types.ObjectId, ref: 'ForumCategory', required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  is_pinned: { type: Boolean, default: false },
  is_locked: { type: Boolean, default: false },
  is_solved: { type: Boolean, default: false },
  solved_reply_id: { type: Schema.Types.ObjectId, ref: 'ForumReply' },
  views: { type: Number, default: 0 },
  reply_count: { type: Number, default: 0 },
  last_reply_at: { type: Date },
  tags: [{ type: String }],
  status: { type: String, enum: ['active', 'closed', 'spam'], default: 'active' },
}, defaultSchemaOptions);

forumThreadSchema.index({ tenant_id: 1, category_id: 1, created_at: -1 });
forumThreadSchema.index({ tenant_id: 1, status: 1 });
forumThreadSchema.index({ tenant_id: 1, tags: 1 });
forumThreadSchema.index({ title: 'text', body: 'text' });

export const ForumThread = mongoose.model<IForumThread>('ForumThread', forumThreadSchema);
export default ForumThread;

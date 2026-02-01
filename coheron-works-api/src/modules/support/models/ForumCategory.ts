import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IForumCategory extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  thread_count: number;
  reply_count: number;
}

const forumCategorySchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  slug: { type: String, required: true },
  icon: { type: String, default: '' },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  thread_count: { type: Number, default: 0 },
  reply_count: { type: Number, default: 0 },
}, defaultSchemaOptions);

forumCategorySchema.index({ tenant_id: 1, slug: 1 }, { unique: true });
forumCategorySchema.index({ tenant_id: 1, sort_order: 1 });

export const ForumCategory = mongoose.model<IForumCategory>('ForumCategory', forumCategorySchema);
export default ForumCategory;

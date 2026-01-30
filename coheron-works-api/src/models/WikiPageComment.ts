import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IWikiPageComment extends Document {
  page_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  comment_text: string;
  parent_comment_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const wikiPageCommentSchema = new Schema<IWikiPageComment>({
  page_id: { type: Schema.Types.ObjectId, ref: 'WikiPage', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  comment_text: { type: String, required: true },
  parent_comment_id: { type: Schema.Types.ObjectId, ref: 'WikiPageComment' },
}, defaultSchemaOptions);

// Indexes
wikiPageCommentSchema.index({ page_id: 1 });
wikiPageCommentSchema.index({ user_id: 1 });
wikiPageCommentSchema.index({ parent_comment_id: 1 });
wikiPageCommentSchema.index({ page_id: 1, created_at: -1 });

export default mongoose.model<IWikiPageComment>('WikiPageComment', wikiPageCommentSchema);

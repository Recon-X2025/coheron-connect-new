import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IWikiPage extends Document {
  space_id: mongoose.Types.ObjectId;
  parent_page_id?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  page_type: string;
  template_id?: mongoose.Types.ObjectId;
  is_published: boolean;
  version: number;
  created_by?: mongoose.Types.ObjectId;
  updated_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const wikiPageSchema = new Schema<IWikiPage>({
  space_id: { type: Schema.Types.ObjectId, ref: 'KnowledgeSpace', required: true },
  parent_page_id: { type: Schema.Types.ObjectId, ref: 'WikiPage' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  page_type: { type: String, default: 'page' },
  template_id: { type: Schema.Types.ObjectId },
  is_published: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
wikiPageSchema.index({ space_id: 1 });
wikiPageSchema.index({ parent_page_id: 1 });
wikiPageSchema.index({ template_id: 1 });
wikiPageSchema.index({ created_by: 1 });
wikiPageSchema.index({ updated_by: 1 });
wikiPageSchema.index({ is_published: 1 });
wikiPageSchema.index({ created_at: -1 });
wikiPageSchema.index({ space_id: 1, is_published: 1 });

export default mongoose.model<IWikiPage>('WikiPage', wikiPageSchema);

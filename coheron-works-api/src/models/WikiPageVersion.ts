import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IWikiPageVersion extends Document {
  page_id: mongoose.Types.ObjectId;
  version: number;
  title: string;
  content: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const wikiPageVersionSchema = new Schema<IWikiPageVersion>({
  page_id: { type: Schema.Types.ObjectId, ref: 'WikiPage', required: true },
  version: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
wikiPageVersionSchema.index({ page_id: 1 });
wikiPageVersionSchema.index({ created_by: 1 });
wikiPageVersionSchema.index({ page_id: 1, version: -1 });
wikiPageVersionSchema.index({ created_at: -1 });

export default mongoose.model<IWikiPageVersion>('WikiPageVersion', wikiPageVersionSchema);

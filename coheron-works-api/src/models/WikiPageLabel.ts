import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IWikiPageLabel extends Document {
  page_id: mongoose.Types.ObjectId;
  label: string;
  created_at: Date;
  updated_at: Date;
}

const wikiPageLabelSchema = new Schema<IWikiPageLabel>({
  page_id: { type: Schema.Types.ObjectId, ref: 'WikiPage', required: true },
  label: { type: String, required: true },
}, defaultSchemaOptions);

wikiPageLabelSchema.index({ page_id: 1, label: 1 }, { unique: true });
wikiPageLabelSchema.index({ label: 1 });

export default mongoose.model<IWikiPageLabel>('WikiPageLabel', wikiPageLabelSchema);

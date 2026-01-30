import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IWikiPageAttachment extends Document {
  page_id: mongoose.Types.ObjectId;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  uploaded_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const wikiPageAttachmentSchema = new Schema<IWikiPageAttachment>({
  page_id: { type: Schema.Types.ObjectId, ref: 'WikiPage', required: true },
  file_name: { type: String },
  file_url: { type: String },
  file_size: { type: Number },
  file_type: { type: String },
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
wikiPageAttachmentSchema.index({ page_id: 1 });
wikiPageAttachmentSchema.index({ uploaded_by: 1 });
wikiPageAttachmentSchema.index({ created_at: -1 });

export default mongoose.model<IWikiPageAttachment>('WikiPageAttachment', wikiPageAttachmentSchema);

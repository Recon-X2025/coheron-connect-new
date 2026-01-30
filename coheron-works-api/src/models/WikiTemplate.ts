import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IWikiTemplate extends Document {
  space_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  template_content: string;
  template_type: string;
  is_system: boolean;
  created_by: mongoose.Types.ObjectId;
}

const wikiTemplateSchema = new Schema<IWikiTemplate>({
  space_id: { type: Schema.Types.ObjectId, ref: 'KnowledgeSpace' },
  name: { type: String, required: true },
  description: { type: String },
  template_content: { type: String, required: true },
  template_type: { type: String },
  is_system: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
wikiTemplateSchema.index({ space_id: 1 });
wikiTemplateSchema.index({ created_by: 1 });
wikiTemplateSchema.index({ template_type: 1 });
wikiTemplateSchema.index({ is_system: 1 });

export default mongoose.model<IWikiTemplate>('WikiTemplate', wikiTemplateSchema);

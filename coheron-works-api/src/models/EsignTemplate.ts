import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IEsignTemplate extends Document {
  template_name: string;
  description: string;
  document_type: string;
  file_path: string;
  file_url: string;
  default_signers: any;
  default_fields: any;
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
}

const esignTemplateSchema = new Schema<IEsignTemplate>({
  template_name: { type: String, required: true },
  description: { type: String },
  document_type: { type: String },
  file_path: { type: String },
  file_url: { type: String },
  default_signers: { type: Schema.Types.Mixed },
  default_fields: { type: Schema.Types.Mixed },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
esignTemplateSchema.index({ created_by: 1 });
esignTemplateSchema.index({ is_active: 1 });
esignTemplateSchema.index({ document_type: 1 });

export default mongoose.model<IEsignTemplate>('EsignTemplate', esignTemplateSchema);

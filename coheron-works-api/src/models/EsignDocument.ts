import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IEsignDocument extends Document {
  document_name: string;
  document_type: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  related_record_type: string;
  related_record_id: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  expires_at: Date;
  message: string;
  reminder_enabled: boolean;
  reminder_frequency: number;
  status: string;
  completed_at: Date;
}

const esignDocumentSchema = new Schema<IEsignDocument>({
  document_name: { type: String, required: true },
  document_type: { type: String, default: 'other' },
  file_path: { type: String },
  file_url: { type: String },
  file_size: { type: Number },
  mime_type: { type: String },
  related_record_type: { type: String },
  related_record_id: { type: Schema.Types.ObjectId },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  expires_at: { type: Date },
  message: { type: String },
  reminder_enabled: { type: Boolean, default: true },
  reminder_frequency: { type: Number, default: 3 },
  status: { type: String, default: 'draft' },
  completed_at: { type: Date },
}, defaultSchemaOptions);

// Indexes
esignDocumentSchema.index({ created_by: 1 });
esignDocumentSchema.index({ status: 1 });
esignDocumentSchema.index({ related_record_id: 1 });
esignDocumentSchema.index({ related_record_type: 1, related_record_id: 1 });
esignDocumentSchema.index({ created_at: -1 });
esignDocumentSchema.index({ status: 1, created_at: -1 });
esignDocumentSchema.index({ expires_at: 1 });

export default mongoose.model<IEsignDocument>('EsignDocument', esignDocumentSchema);

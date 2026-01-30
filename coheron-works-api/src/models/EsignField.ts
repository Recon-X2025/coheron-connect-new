import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IEsignField extends Document {
  document_id: mongoose.Types.ObjectId;
  signer_id: mongoose.Types.ObjectId;
  field_type: string;
  field_name: string;
  page_number: number;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  required: boolean;
  value: string;
  filled_at: Date;
}

const esignFieldSchema = new Schema<IEsignField>({
  document_id: { type: Schema.Types.ObjectId, ref: 'EsignDocument', required: true },
  signer_id: { type: Schema.Types.ObjectId, ref: 'EsignSigner' },
  field_type: { type: String, required: true },
  field_name: { type: String },
  page_number: { type: Number },
  x_position: { type: Number },
  y_position: { type: Number },
  width: { type: Number, default: 200 },
  height: { type: Number, default: 50 },
  required: { type: Boolean, default: true },
  value: { type: String },
  filled_at: { type: Date },
}, defaultSchemaOptions);

// Indexes
esignFieldSchema.index({ document_id: 1 });
esignFieldSchema.index({ signer_id: 1 });
esignFieldSchema.index({ document_id: 1, signer_id: 1 });
esignFieldSchema.index({ document_id: 1, page_number: 1 });

export default mongoose.model<IEsignField>('EsignField', esignFieldSchema);

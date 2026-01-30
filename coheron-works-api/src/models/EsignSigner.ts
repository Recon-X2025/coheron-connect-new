import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IEsignSigner extends Document {
  document_id: mongoose.Types.ObjectId;
  signer_order: number;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  authentication_method: string;
  access_code: string;
  status: string;
  sent_at: Date;
  signed_at: Date;
  declined_at: Date;
  decline_reason: string;
  signature_data: string;
  signature_type: string;
  ip_address: string;
  user_agent: string;
}

const esignSignerSchema = new Schema<IEsignSigner>({
  document_id: { type: Schema.Types.ObjectId, ref: 'EsignDocument', required: true },
  signer_order: { type: Number, required: true },
  signer_name: { type: String, required: true },
  signer_email: { type: String, required: true },
  signer_role: { type: String, default: 'signer' },
  authentication_method: { type: String, default: 'email' },
  access_code: { type: String },
  status: { type: String, default: 'pending' },
  sent_at: { type: Date },
  signed_at: { type: Date },
  declined_at: { type: Date },
  decline_reason: { type: String },
  signature_data: { type: String },
  signature_type: { type: String },
  ip_address: { type: String },
  user_agent: { type: String },
}, defaultSchemaOptions);

// Indexes
esignSignerSchema.index({ document_id: 1 });
esignSignerSchema.index({ status: 1 });
esignSignerSchema.index({ signer_email: 1 });
esignSignerSchema.index({ document_id: 1, signer_order: 1 });
esignSignerSchema.index({ document_id: 1, status: 1 });

export default mongoose.model<IEsignSigner>('EsignSigner', esignSignerSchema);

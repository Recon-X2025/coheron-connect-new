import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IEsignAuditTrail extends Document {
  document_id: mongoose.Types.ObjectId;
  signer_id: mongoose.Types.ObjectId;
  action: string;
  description: string;
  metadata: any;
  ip_address: string;
  user_agent: string;
}

const esignAuditTrailSchema = new Schema<IEsignAuditTrail>({
  document_id: { type: Schema.Types.ObjectId, ref: 'EsignDocument', required: true },
  signer_id: { type: Schema.Types.ObjectId, ref: 'EsignSigner' },
  action: { type: String, required: true },
  description: { type: String },
  metadata: { type: Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
}, defaultSchemaOptions);

// Indexes
esignAuditTrailSchema.index({ document_id: 1 });
esignAuditTrailSchema.index({ signer_id: 1 });
esignAuditTrailSchema.index({ action: 1 });
esignAuditTrailSchema.index({ document_id: 1, created_at: -1 });

export default mongoose.model<IEsignAuditTrail>('EsignAuditTrail', esignAuditTrailSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICertificationRecord extends Document {
  tenant_id: mongoose.Types.ObjectId;
  certification_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  status: 'in_progress' | 'earned' | 'expired' | 'revoked';
  earned_at?: Date;
  expires_at?: Date;
  score: number;
  certificate_url: string;
  renewed_from?: mongoose.Types.ObjectId;
}

const certificationRecordSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  certification_id: { type: Schema.Types.ObjectId, ref: 'Certification', required: true, index: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['in_progress', 'earned', 'expired', 'revoked'], default: 'in_progress' },
  earned_at: Date,
  expires_at: Date,
  score: { type: Number, default: 0 },
  certificate_url: { type: String, default: '' },
  renewed_from: { type: Schema.Types.ObjectId, ref: 'CertificationRecord' },
}, defaultSchemaOptions);

certificationRecordSchema.index({ tenant_id: 1, employee_id: 1, certification_id: 1 });
certificationRecordSchema.index({ tenant_id: 1, expires_at: 1 });

export const CertificationRecord = mongoose.model<ICertificationRecord>('CertificationRecord', certificationRecordSchema);

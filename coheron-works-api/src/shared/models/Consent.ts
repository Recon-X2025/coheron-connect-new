import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IConsent extends Document {
  user_id: mongoose.Types.ObjectId;
  tenant_id: mongoose.Types.ObjectId;
  purpose: 'marketing' | 'analytics' | 'data_processing' | 'third_party' | 'cookies' | 'newsletter';
  granted: boolean;
  granted_at?: Date;
  withdrawn_at?: Date;
  source?: string;
  version?: string;
  ip_address?: string;
}

const consentSchema = new Schema<IConsent>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  purpose: {
    type: String,
    required: true,
    enum: ['marketing', 'analytics', 'data_processing', 'third_party', 'cookies', 'newsletter'],
  },
  granted: { type: Boolean, required: true },
  granted_at: { type: Date },
  withdrawn_at: { type: Date },
  source: { type: String },
  version: { type: String },
  ip_address: { type: String },
}, defaultSchemaOptions);

consentSchema.index({ user_id: 1, tenant_id: 1, purpose: 1 });

export const Consent = mongoose.model<IConsent>('Consent', consentSchema);
export default Consent;

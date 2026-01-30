import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IRetentionPolicy extends Document {
  tenant_id: mongoose.Types.ObjectId;
  entity_type: string;
  retention_period_days: number;
  action_on_expiry: 'delete' | 'anonymize' | 'archive';
  legal_basis?: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const retentionPolicySchema = new Schema<IRetentionPolicy>({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  entity_type: { type: String, required: true },
  retention_period_days: { type: Number, required: true },
  action_on_expiry: {
    type: String,
    required: true,
    enum: ['delete', 'anonymize', 'archive'],
  },
  legal_basis: { type: String },
  description: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

retentionPolicySchema.index({ tenant_id: 1, entity_type: 1 }, { unique: true });

export const RetentionPolicy = mongoose.model<IRetentionPolicy>('RetentionPolicy', retentionPolicySchema);
export default RetentionPolicy;

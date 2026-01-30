import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface ISecurityEvent extends Document {
  tenant_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  description?: string;
  ip_address?: string;
  user_agent?: string;
  details?: any;
  timestamp: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  event_type: {
    type: String,
    required: true,
    index: true,
    enum: [
      'login_success',
      'login_failure',
      'logout',
      'password_change',
      'password_reset',
      '2fa_enabled',
      '2fa_disabled',
      'permission_escalation',
      'role_change',
      'data_export',
      'data_deletion',
      'account_locked',
      'account_unlocked',
      'suspicious_activity',
      'token_revoked',
      'session_created',
      'session_terminated',
    ],
  },
  severity: {
    type: String,
    required: true,
    index: true,
    enum: ['info', 'warning', 'critical'],
  },
  description: { type: String },
  ip_address: { type: String },
  user_agent: { type: String },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
}, defaultSchemaOptions);

securityEventSchema.index({ tenant_id: 1, event_type: 1, timestamp: -1 });
securityEventSchema.index({ tenant_id: 1, severity: 1, timestamp: -1 });

export const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', securityEventSchema);
export default SecurityEvent;

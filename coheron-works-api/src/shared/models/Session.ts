import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface ISession extends Document {
  user_id: mongoose.Types.ObjectId;
  tenant_id: mongoose.Types.ObjectId;
  jti: string;
  ip_address: string;
  user_agent: string;
  device_info: string;
  last_active_at: Date;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
}

const sessionSchema = new Schema<ISession>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  jti: { type: String, required: true, unique: true },
  ip_address: { type: String },
  user_agent: { type: String },
  device_info: { type: String },
  last_active_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

// Compound index for querying active sessions per user per tenant
sessionSchema.index({ user_id: 1, tenant_id: 1, is_active: 1 });

// TTL index: MongoDB auto-deletes documents once expires_at has passed
sessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
export default Session;

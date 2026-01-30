import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface ITokenBlacklist extends Document {
  jti: string;
  user_id: mongoose.Types.ObjectId;
  tenant_id: mongoose.Types.ObjectId;
  reason: 'logout' | 'password_change' | 'admin_revoke' | 'session_expired';
  expires_at: Date;
  created_at: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>({
  jti: { type: String, required: true, unique: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  reason: {
    type: String,
    enum: ['logout', 'password_change', 'admin_revoke', 'session_expired'],
  },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

// TTL index: MongoDB auto-deletes documents once expires_at has passed
tokenBlacklistSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);
export default TokenBlacklist;

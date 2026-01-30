import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IUser extends Document {
  uid: number;
  name: string;
  email: string;
  password_hash: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  two_factor_enabled: boolean;
  two_factor_method: string;
  avatar_url: string;
  timezone: string;
  locale: string;
  tenant_id: mongoose.Types.ObjectId;
  role_id: mongoose.Types.ObjectId;
  last_login_at: Date;
  password_changed_at: Date;
  password_history: string[];
  failed_login_attempts: number;
  account_locked_until: Date;
  last_login_ip: string;
  last_login_user_agent: string;
}

const userSchema = new Schema<IUser>({
  uid: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  active: { type: Boolean, default: true },
  // --- Two-factor authentication ---
  two_factor_enabled: { type: Boolean, default: false },
  two_factor_method: { type: String, enum: ['totp', 'sms', 'email'] },
  // --- Profile ---
  avatar_url: { type: String },
  timezone: { type: String, default: 'Asia/Kolkata' },
  locale: { type: String, default: 'en' },
  tenant_id: { type: Schema.Types.ObjectId },
  role_id: { type: Schema.Types.ObjectId },
  last_login_at: { type: Date },
  // --- Password & security ---
  password_changed_at: { type: Date },
  password_history: [{ type: String }],
  failed_login_attempts: { type: Number, default: 0 },
  account_locked_until: { type: Date },
  last_login_ip: { type: String },
  last_login_user_agent: { type: String },
}, defaultSchemaOptions);

// Indexes
userSchema.index({ active: 1 });
userSchema.index({ created_at: -1 });
userSchema.index({ account_locked_until: 1 }, { sparse: true });

export default mongoose.model<IUser>('User', userSchema);

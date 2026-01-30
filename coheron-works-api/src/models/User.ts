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
  tenant_id: mongoose.Types.ObjectId;
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
}, defaultSchemaOptions);

// Indexes
userSchema.index({ active: 1 });
userSchema.index({ created_at: -1 });

export default mongoose.model<IUser>('User', userSchema);

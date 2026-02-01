import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ISocialAccount extends Document {
  tenant_id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok';
  account_name: string;
  account_id: string;
  access_token: string;
  refresh_token?: string;
  avatar_url?: string;
  followers_count: number;
  is_connected: boolean;
  connected_at?: Date;
  expires_at?: Date;
}

const socialAccountSchema = new Schema<ISocialAccount>({
  tenant_id: { type: String, required: true, index: true },
  platform: { type: String, enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'], required: true },
  account_name: { type: String, required: true },
  account_id: { type: String, required: true },
  access_token: { type: String, required: true },
  refresh_token: String,
  avatar_url: String,
  followers_count: { type: Number, default: 0 },
  is_connected: { type: Boolean, default: true },
  connected_at: { type: Date, default: Date.now },
  expires_at: Date,
}, defaultSchemaOptions);

socialAccountSchema.index({ tenant_id: 1, platform: 1 });

export const SocialAccount = (mongoose.models.SocialAccount as mongoose.Model<ISocialAccount>) || mongoose.model<ISocialAccount>('SocialAccount', socialAccountSchema);

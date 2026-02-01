import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const socialAccountSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId },
  platform: { type: String, enum: ['facebook', 'twitter', 'linkedin', 'instagram'], required: true },
  account_name: { type: String, required: true },
  account_id: { type: String, required: true },
  access_token: { type: String },
  refresh_token: { type: String },
  token_expires_at: { type: Date },
  page_id: { type: String },
  is_active: { type: Boolean, default: true },
  last_synced_at: { type: Date },
}, schemaOptions);

socialAccountSchema.index({ tenant_id: 1, platform: 1, account_id: 1 }, { unique: true });

export const SocialAccount = mongoose.models.SocialAccount || mongoose.model('SocialAccount', socialAccountSchema);

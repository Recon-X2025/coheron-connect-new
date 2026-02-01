import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ISocialPost extends Document {
  tenant_id: string;
  content: string;
  media_urls: string[];
  platforms: Array<{
    platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok';
    account_id: string;
    post_id?: string;
    status: 'scheduled' | 'published' | 'failed' | 'draft';
    published_at?: Date;
    error_message?: string;
    engagement: { likes: number; comments: number; shares: number; clicks: number; impressions: number; reach: number };
  }>;
  scheduled_at?: Date;
  published_at?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'partially_published' | 'failed';
  tags: string[];
  campaign_id?: string;
  created_by?: string;
}

const socialPostSchema = new Schema<ISocialPost>({
  tenant_id: { type: String, required: true, index: true },
  content: { type: String, required: true },
  media_urls: [String],
  platforms: [{
    platform: { type: String, enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'], required: true },
    account_id: String,
    post_id: String,
    status: { type: String, enum: ['scheduled', 'published', 'failed', 'draft'], default: 'draft' },
    published_at: Date,
    error_message: String,
    engagement: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
    },
  }],
  scheduled_at: Date,
  published_at: Date,
  status: { type: String, enum: ['draft', 'scheduled', 'published', 'partially_published', 'failed'], default: 'draft' },
  tags: [String],
  campaign_id: String,
  created_by: String,
}, defaultSchemaOptions);

socialPostSchema.index({ tenant_id: 1, scheduled_at: 1 });

export const SocialPost = (mongoose.models.SocialPost as mongoose.Model<ISocialPost>) || mongoose.model<ISocialPost>('SocialPost', socialPostSchema);

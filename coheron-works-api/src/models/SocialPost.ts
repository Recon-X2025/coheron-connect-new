import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const socialPostSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId },
  campaign_id: { type: Schema.Types.ObjectId },
  content: { type: String, required: true },
  media_urls: [{ type: String }],
  platforms: [{
    platform: { type: String, enum: ['facebook', 'twitter', 'linkedin', 'instagram'] },
    account_id: { type: String },
    post_id: { type: String },
    status: { type: String, enum: ['draft', 'scheduled', 'published', 'failed'], default: 'draft' },
    published_at: { type: Date },
    error_message: { type: String }
  }],
  scheduled_at: { type: Date },
  published_at: { type: Date },
  status: { type: String, enum: ['draft', 'scheduled', 'publishing', 'published', 'partially_published', 'failed'], default: 'draft' },
  engagement: {
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 }
  },
  created_by: { type: Schema.Types.ObjectId },
}, schemaOptions);

socialPostSchema.index({ tenant_id: 1, status: 1, scheduled_at: 1 });
socialPostSchema.index({ tenant_id: 1, campaign_id: 1 });

export const SocialPost = mongoose.model('SocialPost', socialPostSchema);

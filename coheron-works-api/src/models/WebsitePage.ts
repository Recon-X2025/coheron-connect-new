import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWebsitePage extends Document {
  name: string;
  url: string;
  slug: string;
  site_id: mongoose.Types.ObjectId;
  template: string;
  status: string;
  is_published: boolean;
  content: string;
  blocks: any;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  canonical_url: string;
  robots_meta: string;
  publish_at: Date;
  published_at: Date;
  created_by: mongoose.Types.ObjectId;
  updated_by: mongoose.Types.ObjectId;
  version: number;
}

const websitePageSchema = new Schema({
  name: { type: String },
  url: { type: String },
  slug: { type: String },
  site_id: { type: Schema.Types.ObjectId, ref: 'WebsiteSite' },
  template: { type: String, default: 'default' },
  status: { type: String, default: 'draft' },
  is_published: { type: Boolean, default: false },
  content: { type: String },
  blocks: { type: Schema.Types.Mixed, default: [] },
  meta_title: { type: String },
  meta_description: { type: String },
  meta_keywords: { type: String },
  canonical_url: { type: String },
  robots_meta: { type: String, default: 'index, follow' },
  publish_at: { type: Date },
  published_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 },
}, schemaOptions);

// Indexes
websitePageSchema.index({ site_id: 1 });
websitePageSchema.index({ status: 1 });
websitePageSchema.index({ is_published: 1 });
websitePageSchema.index({ created_by: 1 });
websitePageSchema.index({ updated_by: 1 });
websitePageSchema.index({ slug: 1, site_id: 1 });
websitePageSchema.index({ site_id: 1, status: 1 });
websitePageSchema.index({ created_at: -1 });

export const PaymentGatewaySchema = new Schema({
  name: { type: String, required: true, unique: true },
  provider: { type: String },
  api_key: { type: String },
  api_secret: { type: String },
  webhook_secret: { type: String },
  is_active: { type: Boolean, default: true },
  config: { type: Schema.Types.Mixed },
}, schemaOptions);

export const WebsiteSettingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  robots_content: { type: String },
  value: { type: Schema.Types.Mixed },
}, schemaOptions);

export const WebsiteAnalyticsSchema = new Schema({
  event_type: { type: String, required: true },
  page_id: { type: Schema.Types.ObjectId, ref: 'WebsitePage' },
  visitor_id: { type: String },
  event_data: { type: Schema.Types.Mixed },
}, schemaOptions);

// Indexes for sub-schemas
WebsiteAnalyticsSchema.index({ event_type: 1 });
WebsiteAnalyticsSchema.index({ page_id: 1 });
WebsiteAnalyticsSchema.index({ visitor_id: 1 });
WebsiteAnalyticsSchema.index({ created_at: -1 });

export const WebsitePage = mongoose.model<IWebsitePage>('WebsitePage', websitePageSchema);
export const PaymentGateway = mongoose.model('PaymentGateway', PaymentGatewaySchema);
export const WebsiteSetting = mongoose.model('WebsiteSetting', WebsiteSettingSchema);
export const WebsiteAnalytics = mongoose.model('WebsiteAnalytics', WebsiteAnalyticsSchema);

export default WebsitePage;

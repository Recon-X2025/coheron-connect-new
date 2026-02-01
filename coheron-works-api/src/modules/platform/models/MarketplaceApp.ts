import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IMarketplaceApp extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  long_description: string;
  category: string;
  developer_name: string;
  developer_email: string;
  version: string;
  icon_url: string;
  screenshots: string[];
  pricing_type: string;
  price: number;
  currency: string;
  features: string[];
  permissions: string[];
  api_scopes: string[];
  webhook_url: string;
  install_count: number;
  rating: number;
  rating_count: number;
  status: string;
  is_verified: boolean;
}

const marketplaceAppSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  long_description: { type: String, default: '' },
  category: { type: String, enum: ['integration', 'analytics', 'automation', 'communication', 'finance', 'hr', 'other'], default: 'other' },
  developer_name: { type: String, default: '' },
  developer_email: { type: String, default: '' },
  version: { type: String, default: '1.0.0' },
  icon_url: { type: String, default: '' },
  screenshots: [{ type: String }],
  pricing_type: { type: String, enum: ['free', 'paid', 'freemium'], default: 'free' },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  features: [{ type: String }],
  permissions: [{ type: String }],
  api_scopes: [{ type: String }],
  webhook_url: { type: String, default: '' },
  install_count: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'deprecated'], default: 'draft' },
  is_verified: { type: Boolean, default: false },
}, defaultSchemaOptions);

marketplaceAppSchema.index({ tenant_id: 1, slug: 1 }, { unique: true });
marketplaceAppSchema.index({ status: 1, category: 1 });
marketplaceAppSchema.index({ name: 'text', description: 'text' });

export const MarketplaceApp = mongoose.model<IMarketplaceApp>('MarketplaceApp', marketplaceAppSchema);
export default MarketplaceApp;

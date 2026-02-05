import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketplaceApp extends Document {
  name: string;
  slug: string;
  description: string;
  long_description: string;
  developer_id: mongoose.Types.ObjectId;
  developer_name: string;
  category: string;
  version: string;
  icon_url: string;
  pricing_type: 'free' | 'paid' | 'freemium';
  price: number;
  currency: string;
  features: string[];
  required_scopes: string[];
  webhook_url: string;
  install_count: number;
  rating: number;
  rating_count: number;
  status: 'draft' | 'review' | 'published' | 'suspended';
  is_verified: boolean;
  is_featured: boolean;
}

const schema = new Schema<IMarketplaceApp>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  long_description: { type: String, default: '' },
  developer_id: { type: Schema.Types.ObjectId },
  developer_name: { type: String, default: '' },
  category: { type: String, required: true, index: true },
  version: { type: String, default: '1.0.0' },
  icon_url: { type: String, default: '' },
  pricing_type: { type: String, enum: ['free', 'paid', 'freemium'], default: 'free' },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  features: [{ type: String }],
  required_scopes: [{ type: String }],
  webhook_url: { type: String, default: '' },
  install_count: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'review', 'published', 'suspended'], default: 'draft' },
  is_verified: { type: Boolean, default: false },
  is_featured: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.MarketplaceApp as mongoose.Model<IMarketplaceApp> || mongoose.model<IMarketplaceApp>('MarketplaceApp', schema);

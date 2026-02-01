import mongoose, { Schema, Document } from 'mongoose';

export interface IECommerceChannel extends Document {
  tenant_id: mongoose.Types.ObjectId;
  channel_name: string;
  platform: 'shopify' | 'woocommerce' | 'magento' | 'custom';
  api_key: string;
  api_secret: string;
  store_url: string;
  webhook_secret?: string;
  sync_products: boolean;
  sync_orders: boolean;
  sync_inventory: boolean;
  last_sync_at?: Date;
  status: 'active' | 'inactive' | 'error' | 'pending';
  settings: Map<string, any>;
  created_at: Date;
  updated_at: Date;
}

const eCommerceChannelSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  channel_name: { type: String, required: true },
  platform: { type: String, enum: ['shopify', 'woocommerce', 'magento', 'custom'], required: true },
  api_key: { type: String, required: true },
  api_secret: { type: String, required: true },
  store_url: { type: String, required: true },
  webhook_secret: { type: String },
  sync_products: { type: Boolean, default: true },
  sync_orders: { type: Boolean, default: true },
  sync_inventory: { type: Boolean, default: true },
  last_sync_at: { type: Date },
  status: { type: String, enum: ['active', 'inactive', 'error', 'pending'], default: 'pending' },
  settings: { type: Map, of: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

eCommerceChannelSchema.index({ tenant_id: 1, platform: 1 });
eCommerceChannelSchema.index({ tenant_id: 1, store_url: 1 }, { unique: true });

export const ECommerceChannel = mongoose.model<IECommerceChannel>('ECommerceChannel', eCommerceChannelSchema);

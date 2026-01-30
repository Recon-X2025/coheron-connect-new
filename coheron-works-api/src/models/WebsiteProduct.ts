import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWebsiteProduct extends Document {
  product_id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
  short_description: string;
  long_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  sync_status: string;
  last_synced_at: Date;
}

const websiteProductSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  site_id: { type: Schema.Types.ObjectId, ref: 'WebsiteSite' },
  is_published: { type: Boolean, default: false },
  is_featured: { type: Boolean, default: false },
  display_order: { type: Number, default: 0 },
  short_description: { type: String },
  long_description: { type: String },
  seo_title: { type: String },
  seo_description: { type: String },
  seo_keywords: { type: String },
  sync_status: { type: String, default: 'pending' },
  last_synced_at: { type: Date },
}, schemaOptions);

// Indexes
websiteProductSchema.index({ product_id: 1 });
websiteProductSchema.index({ site_id: 1 });
websiteProductSchema.index({ is_published: 1 });
websiteProductSchema.index({ is_featured: 1 });
websiteProductSchema.index({ sync_status: 1 });
websiteProductSchema.index({ site_id: 1, is_published: 1 });
websiteProductSchema.index({ site_id: 1, is_featured: 1, display_order: 1 });

export const WebsiteProductVariantSchema = new Schema({
  website_product_id: { type: Schema.Types.ObjectId, ref: 'WebsiteProduct', required: true },
  name: { type: String },
  sku: { type: String },
  price: { type: Number },
  attributes: { type: Schema.Types.Mixed },
}, schemaOptions);

export const WebsiteCategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String },
  description: { type: String },
  parent_id: { type: Schema.Types.ObjectId, ref: 'WebsiteCategory' },
  site_id: { type: Schema.Types.ObjectId, ref: 'WebsiteSite' },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

export const WebsiteProductCategorySchema = new Schema({
  website_product_id: { type: Schema.Types.ObjectId, ref: 'WebsiteProduct', required: true },
  category_id: { type: Schema.Types.ObjectId, ref: 'WebsiteCategory', required: true },
}, schemaOptions);

// Indexes for sub-schemas
WebsiteProductVariantSchema.index({ website_product_id: 1 });
WebsiteCategorySchema.index({ parent_id: 1 });
WebsiteCategorySchema.index({ site_id: 1 });
WebsiteCategorySchema.index({ is_active: 1 });
WebsiteProductCategorySchema.index({ website_product_id: 1 });
WebsiteProductCategorySchema.index({ category_id: 1 });
WebsiteProductCategorySchema.index({ website_product_id: 1, category_id: 1 });

export const WebsiteProduct = mongoose.model<IWebsiteProduct>('WebsiteProduct', websiteProductSchema);
export const WebsiteProductVariant = mongoose.model('WebsiteProductVariant', WebsiteProductVariantSchema);
export const WebsiteCategory = mongoose.model('WebsiteCategory', WebsiteCategorySchema);
export const WebsiteProductCategory = mongoose.model('WebsiteProductCategory', WebsiteProductCategorySchema);

export default WebsiteProduct;

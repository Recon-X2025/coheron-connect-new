import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWebsiteCart extends Document {
  session_id: string;
  customer_id: mongoose.Types.ObjectId;
  site_id: mongoose.Types.ObjectId;
  currency: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total: number;
  promotion_code: string;
  expires_at: Date;
}

const websiteCartSchema = new Schema({
  session_id: { type: String },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  site_id: { type: Schema.Types.ObjectId, ref: 'WebsiteSite' },
  currency: { type: String, default: 'USD' },
  subtotal: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  shipping_amount: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  promotion_code: { type: String },
  expires_at: { type: Date },
}, schemaOptions);

// Indexes
websiteCartSchema.index({ customer_id: 1 });
websiteCartSchema.index({ site_id: 1 });
websiteCartSchema.index({ session_id: 1 });
websiteCartSchema.index({ expires_at: 1 });

export interface IWebsiteCartItem extends Document {
  cart_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  website_product_id: mongoose.Types.ObjectId;
  variant_id: mongoose.Types.ObjectId;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

const websiteCartItemSchema = new Schema({
  cart_id: { type: Schema.Types.ObjectId, ref: 'WebsiteCart', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  website_product_id: { type: Schema.Types.ObjectId, ref: 'WebsiteProduct' },
  variant_id: { type: Schema.Types.ObjectId },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
}, schemaOptions);

// Indexes for cart items
websiteCartItemSchema.index({ cart_id: 1 });
websiteCartItemSchema.index({ product_id: 1 });
websiteCartItemSchema.index({ website_product_id: 1 });

export const WebsiteCart = mongoose.model<IWebsiteCart>('WebsiteCart', websiteCartSchema);
export const WebsiteCartItem = mongoose.model<IWebsiteCartItem>('WebsiteCartItem', websiteCartItemSchema);

export default WebsiteCart;

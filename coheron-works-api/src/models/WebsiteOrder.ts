import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWebsiteOrder extends Document {
  order_number: string;
  site_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  session_id: string;
  status: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total: number;
  amount_total: number;
  payment_status: string;
  payment_method: string;
  payment_reference: string;
  shipping_address: any;
  billing_address: any;
  shipping_method: string;
  promotion_code: string;
  erp_order_id: mongoose.Types.ObjectId;
}

const websiteOrderSchema = new Schema({
  order_number: { type: String, required: true, unique: true },
  site_id: { type: Schema.Types.ObjectId, ref: 'WebsiteSite' },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  session_id: { type: String },
  status: { type: String, default: 'pending' },
  currency: { type: String, default: 'USD' },
  subtotal: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  shipping_amount: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  amount_total: { type: Number, default: 0 },
  payment_status: { type: String, default: 'pending' },
  payment_method: { type: String },
  payment_reference: { type: String },
  shipping_address: { type: Schema.Types.Mixed },
  billing_address: { type: Schema.Types.Mixed },
  shipping_method: { type: String },
  promotion_code: { type: String },
  erp_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
}, schemaOptions);

// Indexes
websiteOrderSchema.index({ site_id: 1 });
websiteOrderSchema.index({ customer_id: 1 });
websiteOrderSchema.index({ status: 1 });
websiteOrderSchema.index({ payment_status: 1 });
websiteOrderSchema.index({ erp_order_id: 1 });
websiteOrderSchema.index({ created_at: -1 });
websiteOrderSchema.index({ site_id: 1, status: 1 });
websiteOrderSchema.index({ customer_id: 1, status: 1 });

export const WebsiteOrderItemSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'WebsiteOrder', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  website_product_id: { type: Schema.Types.ObjectId, ref: 'WebsiteProduct' },
  variant_id: { type: Schema.Types.ObjectId },
  product_name: { type: String },
  product_sku: { type: String },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
}, schemaOptions);

export const WebsiteOrderStatusHistorySchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'WebsiteOrder', required: true },
  status: { type: String, required: true },
  notes: { type: String },
}, schemaOptions);

// Indexes for sub-schemas
WebsiteOrderItemSchema.index({ order_id: 1 });
WebsiteOrderItemSchema.index({ product_id: 1 });
WebsiteOrderItemSchema.index({ website_product_id: 1 });
WebsiteOrderStatusHistorySchema.index({ order_id: 1 });
WebsiteOrderStatusHistorySchema.index({ order_id: 1, created_at: -1 });

export const WebsiteOrder = mongoose.models.WebsiteOrder || mongoose.model<IWebsiteOrder>('WebsiteOrder', websiteOrderSchema);
export const WebsiteOrderItem = mongoose.models.WebsiteOrderItem || mongoose.model('WebsiteOrderItem', WebsiteOrderItemSchema);
export const WebsiteOrderStatusHistory = mongoose.models.WebsiteOrderStatusHistory || mongoose.model('WebsiteOrderStatusHistory', WebsiteOrderStatusHistorySchema);

export default WebsiteOrder;

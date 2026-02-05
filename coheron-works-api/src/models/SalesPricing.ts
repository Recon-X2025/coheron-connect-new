import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const productPriceSchema = new Schema({
  price_list_id: { type: Schema.Types.ObjectId, ref: 'PriceList' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String },
  price: { type: Number },
  min_quantity: { type: Number, default: 1 },
  valid_from: { type: Date },
  valid_until: { type: Date },
}, schemaOptions);

const priceListSchema = new Schema({
  name: { type: String },
  currency: { type: String, default: 'INR' },
  is_active: { type: Boolean, default: true },
  is_default: { type: Boolean, default: false },
  valid_from: { type: Date },
  valid_until: { type: Date },
}, schemaOptions);

const customerPriceSchema = new Schema({
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  price: { type: Number },
  valid_from: { type: Date },
  valid_until: { type: Date },
}, schemaOptions);

const pricingRuleSchema = new Schema({
  name: { type: String },
  rule_type: { type: String },
  conditions: { type: Schema.Types.Mixed },
  discount_type: { type: String },
  discount_value: { type: Number },
  formula: { type: String },
  priority: { type: Number, default: 10 },
  is_active: { type: Boolean, default: true },
  valid_from: { type: Date },
  valid_until: { type: Date },
}, schemaOptions);

const discountApprovalRuleSchema = new Schema({
  max_discount_percentage: { type: Number },
  max_discount_amount: { type: Number },
  approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
  approval_workflow: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

const promotionalPricingSchema = new Schema({
  name: { type: String },
  campaign_name: { type: String },
  product_ids: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  discount_type: { type: String },
  discount_value: { type: Number },
  buy_x_get_y_config: { type: Schema.Types.Mixed },
  valid_from: { type: Date },
  valid_until: { type: Date },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// ProductPrice indexes
productPriceSchema.index({ price_list_id: 1 });
productPriceSchema.index({ product_id: 1 });
productPriceSchema.index({ price_list_id: 1, product_id: 1 });

// PriceList indexes
priceListSchema.index({ is_active: 1 });

// CustomerPrice indexes
customerPriceSchema.index({ partner_id: 1 });
customerPriceSchema.index({ product_id: 1 });
customerPriceSchema.index({ partner_id: 1, product_id: 1 });

// PricingRule indexes
pricingRuleSchema.index({ is_active: 1 });
pricingRuleSchema.index({ rule_type: 1 });

// DiscountApprovalRule indexes
discountApprovalRuleSchema.index({ approver_id: 1 });
discountApprovalRuleSchema.index({ is_active: 1 });

// PromotionalPricing indexes
promotionalPricingSchema.index({ is_active: 1 });
promotionalPricingSchema.index({ valid_from: 1, valid_until: 1 });

export const PriceList = mongoose.models.PriceList || mongoose.model('PriceList', priceListSchema);
export const ProductPrice = mongoose.models.ProductPrice || mongoose.model('ProductPrice', productPriceSchema);
export const CustomerPrice = mongoose.models.CustomerPrice || mongoose.model('CustomerPrice', customerPriceSchema);
export const PricingRule = mongoose.models.PricingRule || mongoose.model('PricingRule', pricingRuleSchema);
export const DiscountApprovalRule = mongoose.models.DiscountApprovalRule || mongoose.model('DiscountApprovalRule', discountApprovalRuleSchema);
export const PromotionalPricing = mongoose.models.PromotionalPricing || mongoose.model('PromotionalPricing', promotionalPricingSchema);

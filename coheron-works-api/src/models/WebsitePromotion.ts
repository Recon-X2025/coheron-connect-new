import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWebsitePromotion extends Document {
  name: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number;
  valid_from: Date;
  valid_until: Date;
  usage_limit: number;
  usage_limit_per_customer: number;
  usage_count: number;
  is_active: boolean;
  applicable_products: any;
  applicable_categories: any;
  site_id: mongoose.Types.ObjectId;
}

const websitePromotionSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  discount_type: { type: String },
  discount_value: { type: Number },
  min_purchase_amount: { type: Number, default: 0 },
  max_discount_amount: { type: Number },
  valid_from: { type: Date },
  valid_until: { type: Date },
  usage_limit: { type: Number },
  usage_limit_per_customer: { type: Number, default: 1 },
  usage_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  applicable_products: { type: Schema.Types.Mixed },
  applicable_categories: { type: Schema.Types.Mixed },
  site_id: { type: Schema.Types.ObjectId, ref: 'WebsiteSite' },
}, schemaOptions);

// Indexes
websitePromotionSchema.index({ site_id: 1 });
websitePromotionSchema.index({ is_active: 1 });
websitePromotionSchema.index({ valid_from: 1, valid_until: 1 });
websitePromotionSchema.index({ is_active: 1, valid_from: 1, valid_until: 1 });

export const WebsitePromotion = mongoose.model<IWebsitePromotion>('WebsitePromotion', websitePromotionSchema);
export default WebsitePromotion;

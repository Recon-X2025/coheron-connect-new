import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IPricingPlan extends Document {
  tenant_id?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  plan_type: 'tier' | 'industry' | 'addon';
  tier_level: number;
  industry?: string;
  included_modules: string[];
  max_users: number;
  storage_gb: number;
  features: string[];
  base_price_monthly: number;
  base_price_annual: number;
  currency: string;
  per_user_price: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  cta_label: string;
  cta_link: string;
  created_at: Date;
  updated_at: Date;
}

const PricingPlanSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, default: null },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  plan_type: { type: String, enum: ['tier', 'industry', 'addon'], required: true },
  tier_level: { type: Number, default: 0 },
  industry: { type: String },
  included_modules: [{ type: String }],
  max_users: { type: Number, default: 0 },
  storage_gb: { type: Number, default: 0 },
  features: [{ type: String }],
  base_price_monthly: { type: Number, required: true },
  base_price_annual: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  per_user_price: { type: Number, default: 0 },
  is_featured: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  display_order: { type: Number, default: 0 },
  cta_label: { type: String, default: 'Get Started' },
  cta_link: { type: String, default: '/signup' },
}, schemaOptions);

PricingPlanSchema.index({ plan_type: 1, is_active: 1 });
PricingPlanSchema.index({ display_order: 1 });

export const PricingPlan = mongoose.model<IPricingPlan>('PricingPlan', PricingPlanSchema);
export default PricingPlan;

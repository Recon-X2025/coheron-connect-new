import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const commissionPlanSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId },
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['flat_rate', 'percentage', 'tiered', 'milestone'], required: true },
  flat_amount: { type: Number },
  percentage: { type: Number },
  tiers: [{
    from_amount: { type: Number },
    to_amount: { type: Number },
    rate_pct: { type: Number }
  }],
  milestones: [{
    target_amount: { type: Number },
    bonus_amount: { type: Number }
  }],
  applies_to: { type: String, enum: ['all_products', 'specific_products', 'product_categories'], default: 'all_products' },
  product_ids: [{ type: Schema.Types.ObjectId }],
  category_ids: [{ type: Schema.Types.ObjectId }],
  is_active: { type: Boolean, default: true },
}, schemaOptions);

commissionPlanSchema.index({ tenant_id: 1, is_active: 1 });

export const CommissionPlan = mongoose.models.CommissionPlan || mongoose.model('CommissionPlan', commissionPlanSchema);

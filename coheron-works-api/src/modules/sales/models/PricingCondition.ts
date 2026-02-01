import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IPricingCondition extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  condition_type: 'base_price' | 'discount' | 'surcharge' | 'freight' | 'tax' | 'rebate';
  calculation_type: 'fixed' | 'percentage' | 'formula';
  priority: number;
  is_active: boolean;
  valid_from: Date;
  valid_to: Date;
  conditions: Array<{
    dimension: 'customer' | 'customer_group' | 'product' | 'product_category' | 'quantity' | 'region' | 'channel' | 'currency' | 'order_value';
    operator: 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'between';
    value: any;
  }>;
  value: number;
  formula: string;
  scale: Array<{ from: number; to: number; value: number }>;
  exclusive: boolean;
}

const pricingConditionSchema = new Schema<IPricingCondition>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  condition_type: { type: String, enum: ['base_price', 'discount', 'surcharge', 'freight', 'tax', 'rebate'], required: true },
  calculation_type: { type: String, enum: ['fixed', 'percentage', 'formula'], required: true },
  priority: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  valid_from: { type: Date },
  valid_to: { type: Date },
  conditions: [{
    dimension: { type: String, enum: ['customer', 'customer_group', 'product', 'product_category', 'quantity', 'region', 'channel', 'currency', 'order_value'] },
    operator: { type: String, enum: ['eq', 'neq', 'in', 'gt', 'lt', 'between'] },
    value: { type: Schema.Types.Mixed },
  }],
  value: { type: Number },
  formula: { type: String },
  scale: [{ from: Number, to: Number, value: Number }],
  exclusive: { type: Boolean, default: false },
}, defaultSchemaOptions);

pricingConditionSchema.index({ tenant_id: 1, condition_type: 1 });
pricingConditionSchema.index({ tenant_id: 1, priority: 1 });
pricingConditionSchema.index({ tenant_id: 1, is_active: 1, valid_from: 1, valid_to: 1 });

export const PricingCondition = mongoose.model<IPricingCondition>('PricingCondition', pricingConditionSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IDiscountThreshold extends Document {
  discount_min: number;
  discount_max: number;
  approval_role: string;
  auto_approve: boolean;
  is_active: boolean;
}

const discountThresholdSchema = new Schema<IDiscountThreshold>({
  discount_min: { type: Number, required: true },
  discount_max: { type: Number, required: true },
  approval_role: { type: String, required: true },
  auto_approve: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
discountThresholdSchema.index({ is_active: 1 });
discountThresholdSchema.index({ approval_role: 1 });

export default mongoose.model<IDiscountThreshold>('DiscountThreshold', discountThresholdSchema);

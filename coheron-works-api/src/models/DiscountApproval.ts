import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IDiscountApproval extends Document {
  quote_id: mongoose.Types.ObjectId;
  requested_by: mongoose.Types.ObjectId;
  discount_percentage: number;
  original_amount: number;
  discounted_amount: number;
  justification: string;
  status: string;
  approved_by: mongoose.Types.ObjectId;
  approved_at: Date;
  rejection_reason: string;
}

const discountApprovalSchema = new Schema<IDiscountApproval>({
  quote_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder', required: true },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  discount_percentage: { type: Number, required: true },
  original_amount: { type: Number },
  discounted_amount: { type: Number },
  justification: { type: String },
  status: { type: String, default: 'pending' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  rejection_reason: { type: String },
}, defaultSchemaOptions);

// Indexes
discountApprovalSchema.index({ quote_id: 1 });
discountApprovalSchema.index({ requested_by: 1 });
discountApprovalSchema.index({ approved_by: 1 });
discountApprovalSchema.index({ status: 1 });
discountApprovalSchema.index({ status: 1, created_at: -1 });

export default mongoose.models.DiscountApproval as mongoose.Model<IDiscountApproval> || mongoose.model<IDiscountApproval>('DiscountApproval', discountApprovalSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICreditLimit extends Document {
  tenant_id: mongoose.Types.ObjectId;
  partner_id: mongoose.Types.ObjectId;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  currency: string;
  status: 'active' | 'suspended' | 'blocked';
  approved_by: mongoose.Types.ObjectId;
  approved_at: Date;
  review_date: Date;
  risk_rating: 'low' | 'medium' | 'high' | 'critical';
}

const creditLimitSchema = new Schema<ICreditLimit>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  credit_limit: { type: Number, required: true, default: 0 },
  current_balance: { type: Number, default: 0 },
  available_credit: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['active', 'suspended', 'blocked'], default: 'active' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  review_date: { type: Date },
  risk_rating: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
}, defaultSchemaOptions);

creditLimitSchema.index({ tenant_id: 1, partner_id: 1 }, { unique: true });
creditLimitSchema.index({ tenant_id: 1, status: 1 });
creditLimitSchema.index({ tenant_id: 1, risk_rating: 1 });

export const CreditLimit = mongoose.model<ICreditLimit>('CreditLimit', creditLimitSchema);

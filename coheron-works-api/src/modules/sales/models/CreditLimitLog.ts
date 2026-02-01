import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICreditLimitLog extends Document {
  tenant_id: mongoose.Types.ObjectId;
  partner_id: mongoose.Types.ObjectId;
  action: 'increase' | 'decrease' | 'block' | 'unblock' | 'review';
  previous_limit: number;
  new_limit: number;
  reason: string;
  performed_by: mongoose.Types.ObjectId;
  performed_at: Date;
}

const creditLimitLogSchema = new Schema<ICreditLimitLog>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  action: { type: String, enum: ['increase', 'decrease', 'block', 'unblock', 'review'], required: true },
  previous_limit: { type: Number, required: true },
  new_limit: { type: Number, required: true },
  reason: { type: String },
  performed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  performed_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

creditLimitLogSchema.index({ tenant_id: 1, partner_id: 1 });

export const CreditLimitLog = mongoose.model<ICreditLimitLog>('CreditLimitLog', creditLimitLogSchema);

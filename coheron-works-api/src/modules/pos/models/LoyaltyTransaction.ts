import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ILoyaltyTransaction extends Document {
  tenant_id: mongoose.Types.ObjectId;
  program_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  points: number;
  balance_after: number;
  reference_type: 'sale' | 'return' | 'manual';
  reference_id: mongoose.Types.ObjectId;
  description: string;
  created_by: mongoose.Types.ObjectId;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  program_id: { type: Schema.Types.ObjectId, ref: 'LoyaltyProgram', required: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  type: { type: String, enum: ['earn', 'redeem', 'adjust', 'expire'], required: true },
  points: { type: Number, required: true },
  balance_after: { type: Number, required: true },
  reference_type: { type: String, enum: ['sale', 'return', 'manual'] },
  reference_id: { type: Schema.Types.ObjectId },
  description: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

loyaltyTransactionSchema.index({ tenant_id: 1, customer_id: 1 });
loyaltyTransactionSchema.index({ tenant_id: 1, program_id: 1 });

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', loyaltyTransactionSchema);

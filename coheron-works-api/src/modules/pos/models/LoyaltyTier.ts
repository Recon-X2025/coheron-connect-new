import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ILoyaltyTier extends Document {
  tenant_id: mongoose.Types.ObjectId;
  program_id: mongoose.Types.ObjectId;
  name: string;
  min_points: number;
  multiplier: number;
  benefits: { description: string }[];
  color: string;
}

const loyaltyTierSchema = new Schema<ILoyaltyTier>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  program_id: { type: Schema.Types.ObjectId, ref: 'LoyaltyProgram', required: true },
  name: { type: String, required: true },
  min_points: { type: Number, required: true, default: 0 },
  multiplier: { type: Number, default: 1 },
  benefits: [{ description: { type: String } }],
  color: { type: String, default: '#00C971' },
}, defaultSchemaOptions);

loyaltyTierSchema.index({ tenant_id: 1, program_id: 1 });

export const LoyaltyTier = mongoose.model<ILoyaltyTier>('LoyaltyTier', loyaltyTierSchema);

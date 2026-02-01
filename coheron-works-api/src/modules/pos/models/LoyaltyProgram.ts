import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ILoyaltyProgram extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  points_per_currency: number;
  currency: string;
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
}

const loyaltyProgramSchema = new Schema<ILoyaltyProgram>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  points_per_currency: { type: Number, required: true, default: 1 },
  currency: { type: String, default: 'USD' },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

loyaltyProgramSchema.index({ tenant_id: 1, name: 1 });

export const LoyaltyProgram = mongoose.model<ILoyaltyProgram>('LoyaltyProgram', loyaltyProgramSchema);

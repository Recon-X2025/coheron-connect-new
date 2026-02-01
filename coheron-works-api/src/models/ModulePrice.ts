import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IModulePrice extends Document {
  module_name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  category: 'core' | 'advanced' | 'premium';
  icon: string;
  features: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ModulePriceSchema = new Schema({
  module_name: { type: String, required: true, unique: true },
  display_name: { type: String, required: true },
  description: { type: String, default: '' },
  price_monthly: { type: Number, required: true },
  price_annual: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  category: { type: String, enum: ['core', 'advanced', 'premium'], default: 'core' },
  icon: { type: String, default: 'Box' },
  features: [{ type: String }],
  is_active: { type: Boolean, default: true },
}, schemaOptions);

export const ModulePrice = mongoose.model<IModulePrice>('ModulePrice', ModulePriceSchema);
export default ModulePrice;

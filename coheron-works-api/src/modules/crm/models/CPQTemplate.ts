import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICPQTemplate extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  product_lines: Array<{
    product_id: mongoose.Types.ObjectId;
    base_price: number;
    options: Array<{ name: string; price_modifier: number }>;
  }>;
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
}

const cpqTemplateSchema = new Schema<ICPQTemplate>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  product_lines: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    base_price: { type: Number, default: 0 },
    options: [{
      name: { type: String },
      price_modifier: { type: Number, default: 0 },
    }],
  }],
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

cpqTemplateSchema.index({ tenant_id: 1, is_active: 1 });

export const CPQTemplate = mongoose.model<ICPQTemplate>('CPQTemplate', cpqTemplateSchema);

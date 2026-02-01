import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IBlanketOrder extends Document {
  tenant_id: mongoose.Types.ObjectId;
  order_number: string;
  partner_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  total_value: number;
  released_value: number;
  remaining_value: number;
  lines: {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    unit_price: number;
    released_quantity: number;
  }[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  terms: string;
  created_by: mongoose.Types.ObjectId;
}

const blanketOrderSchema = new Schema<IBlanketOrder>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  order_number: { type: String, required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  total_value: { type: Number, default: 0 },
  released_value: { type: Number, default: 0 },
  remaining_value: { type: Number, default: 0 },
  lines: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 0 },
    unit_price: { type: Number, default: 0 },
    released_quantity: { type: Number, default: 0 },
  }],
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
  terms: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

blanketOrderSchema.index({ tenant_id: 1, order_number: 1 }, { unique: true });
blanketOrderSchema.index({ tenant_id: 1, partner_id: 1 });
blanketOrderSchema.index({ tenant_id: 1, status: 1 });

export const BlanketOrder = mongoose.model<IBlanketOrder>('BlanketOrder', blanketOrderSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IBlanketRelease extends Document {
  tenant_id: mongoose.Types.ObjectId;
  blanket_order_id: mongoose.Types.ObjectId;
  release_number: string;
  release_date: Date;
  lines: {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    unit_price: number;
  }[];
  total_value: number;
  sale_order_id: mongoose.Types.ObjectId;
  status: 'draft' | 'confirmed' | 'delivered';
  created_by: mongoose.Types.ObjectId;
}

const blanketReleaseSchema = new Schema<IBlanketRelease>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  blanket_order_id: { type: Schema.Types.ObjectId, ref: 'BlanketOrder', required: true },
  release_number: { type: String, required: true },
  release_date: { type: Date, default: Date.now },
  lines: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 0 },
    unit_price: { type: Number, default: 0 },
  }],
  total_value: { type: Number, default: 0 },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  status: { type: String, enum: ['draft', 'confirmed', 'delivered'], default: 'draft' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

blanketReleaseSchema.index({ tenant_id: 1, blanket_order_id: 1 });

export const BlanketRelease = mongoose.model<IBlanketRelease>('BlanketRelease', blanketReleaseSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IPriceWaterfall extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  order_id: mongoose.Types.ObjectId;
  calculated_at: Date;
  list_price: number;
  steps: Array<{
    condition_id: mongoose.Types.ObjectId;
    condition_name: string;
    condition_type: string;
    adjustment: number;
    running_total: number;
  }>;
  final_price: number;
  margin_pct: number;
}

const priceWaterfallSchema = new Schema<IPriceWaterfall>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  calculated_at: { type: Date, default: Date.now },
  list_price: { type: Number, required: true },
  steps: [{
    condition_id: { type: Schema.Types.ObjectId, ref: 'PricingCondition' },
    condition_name: String,
    condition_type: String,
    adjustment: Number,
    running_total: Number,
  }],
  final_price: { type: Number, required: true },
  margin_pct: { type: Number, default: 0 },
}, defaultSchemaOptions);

priceWaterfallSchema.index({ tenant_id: 1, order_id: 1 });
priceWaterfallSchema.index({ tenant_id: 1, product_id: 1, customer_id: 1 });

export const PriceWaterfall = mongoose.model<IPriceWaterfall>('PriceWaterfall', priceWaterfallSchema);

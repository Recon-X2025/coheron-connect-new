import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IPOSAnalyticsSnapshot extends Document {
  tenant_id: string;
  store_id: string;
  date: Date;
  total_sales: number;
  total_transactions: number;
  avg_transaction_value: number;
  items_sold: number;
  top_products: { product_id: string; name: string; quantity: number; revenue: number }[];
  sales_by_hour: { hour: number; amount: number; count: number }[];
  payment_method_breakdown: { method: string; amount: number; count: number }[];
  returns_amount: number;
  discounts_amount: number;
  tax_collected: number;
}

const POSAnalyticsSnapshotSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  store_id: { type: String, index: true },
  date: { type: Date, required: true },
  total_sales: { type: Number, default: 0 },
  total_transactions: { type: Number, default: 0 },
  avg_transaction_value: { type: Number, default: 0 },
  items_sold: { type: Number, default: 0 },
  top_products: [{
    product_id: String,
    name: String,
    quantity: Number,
    revenue: Number,
  }],
  sales_by_hour: [{
    hour: Number,
    amount: Number,
    count: Number,
  }],
  payment_method_breakdown: [{
    method: String,
    amount: Number,
    count: Number,
  }],
  returns_amount: { type: Number, default: 0 },
  discounts_amount: { type: Number, default: 0 },
  tax_collected: { type: Number, default: 0 },
}, defaultSchemaOptions);

POSAnalyticsSnapshotSchema.index({ tenant_id: 1, store_id: 1, date: -1 }, { unique: true });

export const POSAnalyticsSnapshot = mongoose.model<IPOSAnalyticsSnapshot>('POSAnalyticsSnapshot', POSAnalyticsSnapshotSchema);
export default POSAnalyticsSnapshot;

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IDropshipItem {
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  unit_price_customer: number;
  unit_price_vendor: number;
  margin: number;
}

export interface IDropshipOrder extends Document {
  tenant_id: string;
  dropship_number: string;
  sale_order_id: mongoose.Types.ObjectId;
  purchase_order_id?: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  items: IDropshipItem[];
  customer_shipping_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  status: 'pending' | 'po_created' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  tracking_url?: string;
  customer_total: number;
  vendor_total: number;
  margin_total: number;
  notes?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const dropshipOrderSchema = new Schema<IDropshipOrder>({
  tenant_id: { type: String, required: true },
  dropship_number: { type: String, required: true },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder', required: true },
  purchase_order_id: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  vendor_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  items: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unit_price_customer: { type: Number, required: true },
    unit_price_vendor: { type: Number, required: true },
    margin: { type: Number, default: 0 },
  }],
  customer_shipping_address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
  },
  status: { type: String, enum: ['pending', 'po_created', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  tracking_number: { type: String },
  tracking_url: { type: String },
  customer_total: { type: Number, default: 0 },
  vendor_total: { type: Number, default: 0 },
  margin_total: { type: Number, default: 0 },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

dropshipOrderSchema.index({ tenant_id: 1, dropship_number: 1 }, { unique: true });
dropshipOrderSchema.index({ tenant_id: 1, sale_order_id: 1 });
dropshipOrderSchema.index({ tenant_id: 1, status: 1 });

export const DropshipOrder = mongoose.model<IDropshipOrder>('DropshipOrder', dropshipOrderSchema);
export default DropshipOrder;

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProduct extends Document {
  name: string;
  default_code: string;
  list_price: number;
  standard_price: number;
  qty_available: number;
  type: string;
  categ_id: mongoose.Types.ObjectId;
  image_url: string;
}

const productSchema = new Schema({
  name: { type: String, required: true },
  default_code: { type: String },
  list_price: { type: Number, default: 0 },
  standard_price: { type: Number, default: 0 },
  qty_available: { type: Number, default: 0 },
  type: { type: String, default: 'product' },
  categ_id: { type: Schema.Types.ObjectId },
  image_url: { type: String },

  // --- Enhanced fields ---
  barcode: { type: String },
  sku: { type: String },
  hsn_code: { type: String },

  // --- Pricing ---
  pricing: {
    cost_price: { type: Number, default: 0 },
    selling_price: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    tax_percent: { type: Number, default: 0 },
    volume_pricing: [{
      min_qty: { type: Number },
      price: { type: Number },
    }],
  },

  // --- Inventory settings ---
  inventory_settings: {
    reorder_point: { type: Number, default: 0 },
    safety_stock: { type: Number, default: 0 },
    max_stock: { type: Number },
    lead_time_days: { type: Number, default: 0 },
    valuation_method: { type: String, enum: ['fifo', 'lifo', 'avg', 'specific'], default: 'fifo' },
    tracking: { type: String, enum: ['none', 'serial', 'batch', 'lot'], default: 'none' },
  },

  // --- Stock ---
  stock: {
    total: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    by_warehouse: [{
      warehouse_id: { type: Schema.Types.ObjectId },
      warehouse_name: { type: String },
      quantity: { type: Number, default: 0 },
    }],
    stock_value: { type: Number, default: 0 },
  },

  // --- Physical ---
  weight: { type: Number },
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: { type: String, default: 'cm' },
  },

  // --- Units ---
  units: {
    base_uom: { type: String, default: 'unit' },
    purchase_uom: { type: String },
    sales_uom: { type: String },
    conversions: [{
      from_uom: { type: String },
      to_uom: { type: String },
      factor: { type: Number },
    }],
  },

  // --- Variants ---
  has_variants: { type: Boolean, default: false },
  variant_attributes: [{
    name: { type: String },
    values: [{ type: String }],
  }],
  parent_id: { type: Schema.Types.ObjectId, ref: 'Product' },

  // --- Suppliers ---
  suppliers: [{
    partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
    supplier_sku: { type: String },
    cost_price: { type: Number },
    lead_time_days: { type: Number },
    min_order_qty: { type: Number },
  }],

  // --- Misc ---
  brand: { type: String },
  manufacturer: { type: String },
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

productSchema.index({ name: 1 });
productSchema.index({ type: 1 });
productSchema.index({ categ_id: 1 });
productSchema.index({ default_code: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ hsn_code: 1 });
productSchema.index({ tenant_id: 1 });
productSchema.index({ tenant_id: 1, is_active: 1 });
productSchema.index({ parent_id: 1 });

const ProductModel = mongoose.model('Product', productSchema);
export { ProductModel as Product };
export default ProductModel;

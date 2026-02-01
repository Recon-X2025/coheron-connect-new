import mongoose, { Schema, Document } from 'mongoose';

export interface IByProduct extends Document {
  tenant_id: mongoose.Types.ObjectId;
  manufacturing_order_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  type: 'byproduct' | 'coproduct';
  planned_quantity: number;
  actual_quantity: number;
  uom: string;
  cost_allocation_method: 'none' | 'physical' | 'market_value' | 'manual';
  cost_allocation_percentage: number;
  warehouse_id: mongoose.Types.ObjectId;
  status: 'planned' | 'produced' | 'scrapped';
  notes: string;
  created_at: Date;
  updated_at: Date;
}

const byProductSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  manufacturing_order_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['byproduct', 'coproduct'], required: true },
  planned_quantity: { type: Number, required: true },
  actual_quantity: { type: Number, default: 0 },
  uom: { type: String, required: true },
  cost_allocation_method: { type: String, enum: ['none', 'physical', 'market_value', 'manual'], default: 'none' },
  cost_allocation_percentage: { type: Number, default: 0 },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  status: { type: String, enum: ['planned', 'produced', 'scrapped'], default: 'planned' },
  notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

byProductSchema.index({ tenant_id: 1, manufacturing_order_id: 1 });
byProductSchema.index({ tenant_id: 1, product_id: 1 });

export const ByProduct = mongoose.model<IByProduct>('ByProduct', byProductSchema);

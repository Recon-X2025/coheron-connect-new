import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ILandedCostItem {
  description: string;
  cost_type: 'freight' | 'customs_duty' | 'insurance' | 'handling' | 'inspection' | 'other';
  amount: number;
  currency: string;
  vendor_id?: mongoose.Types.ObjectId;
}

export interface IAllocatedLine {
  product_id: mongoose.Types.ObjectId;
  original_cost: number;
  allocated_cost: number;
  new_unit_cost: number;
  quantity: number;
}

export interface ILandedCost extends Document {
  tenant_id: string;
  landed_cost_number: string;
  purchase_order_id?: mongoose.Types.ObjectId;
  grn_id?: mongoose.Types.ObjectId;
  description: string;
  cost_items: ILandedCostItem[];
  total_additional_cost: number;
  allocation_method: 'by_value' | 'by_quantity' | 'by_weight' | 'by_volume' | 'equal';
  allocated_lines: IAllocatedLine[];
  status: 'draft' | 'allocated' | 'posted';
  journal_entry_id?: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const landedCostSchema = new Schema<ILandedCost>({
  tenant_id: { type: String, required: true },
  landed_cost_number: { type: String, required: true },
  purchase_order_id: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  grn_id: { type: Schema.Types.ObjectId, ref: 'StockGrn' },
  description: { type: String },
  cost_items: [{
    description: { type: String, required: true },
    cost_type: { type: String, enum: ['freight', 'customs_duty', 'insurance', 'handling', 'inspection', 'other'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    vendor_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  }],
  total_additional_cost: { type: Number, default: 0 },
  allocation_method: { type: String, enum: ['by_value', 'by_quantity', 'by_weight', 'by_volume', 'equal'], default: 'by_value' },
  allocated_lines: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    original_cost: { type: Number, required: true },
    allocated_cost: { type: Number, default: 0 },
    new_unit_cost: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
  }],
  status: { type: String, enum: ['draft', 'allocated', 'posted'], default: 'draft' },
  journal_entry_id: { type: Schema.Types.ObjectId, ref: 'AccountMove' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

landedCostSchema.index({ tenant_id: 1, landed_cost_number: 1 }, { unique: true });
landedCostSchema.index({ tenant_id: 1, purchase_order_id: 1 });

export const LandedCost = mongoose.model<ILandedCost>('LandedCost', landedCostSchema);
export default LandedCost;

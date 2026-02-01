import mongoose, { Schema, Document } from 'mongoose';

export interface IFormula extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  formula_number: string;
  version: number;
  output_product_id: mongoose.Types.ObjectId;
  output_quantity: number;
  output_uom: string;
  ingredients: {
    product_id: mongoose.Types.ObjectId;
    quantity: number;
    uom: string;
    percentage: number;
    is_active_ingredient: boolean;
  }[];
  instructions: string[];
  quality_parameters: {
    parameter: string;
    min_value: number;
    max_value: number;
    uom: string;
    is_critical: boolean;
  }[];
  yield_percentage: number;
  status: 'draft' | 'approved' | 'obsolete';
  approved_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ingredientSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  uom: { type: String, required: true },
  percentage: { type: Number, default: 0 },
  is_active_ingredient: { type: Boolean, default: false },
}, { _id: false });

const qualityParamSchema = new Schema({
  parameter: { type: String, required: true },
  min_value: Number,
  max_value: Number,
  uom: String,
  is_critical: { type: Boolean, default: false },
}, { _id: false });

const formulaSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  formula_number: { type: String, required: true },
  version: { type: Number, default: 1 },
  output_product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  output_quantity: { type: Number, required: true },
  output_uom: { type: String, required: true },
  ingredients: [ingredientSchema],
  instructions: [{ type: String }],
  quality_parameters: [qualityParamSchema],
  yield_percentage: { type: Number, default: 100 },
  status: { type: String, enum: ['draft', 'approved', 'obsolete'], default: 'draft' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

formulaSchema.index({ tenant_id: 1, formula_number: 1 }, { unique: true });

export const Formula = mongoose.model<IFormula>('Formula', formulaSchema);

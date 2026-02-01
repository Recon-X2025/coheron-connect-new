import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ICostRollup extends Document {
  tenant_id: string;
  product_id: mongoose.Types.ObjectId;
  version: number;
  cost_components: {
    material_cost: number;
    labor_cost: number;
    overhead_cost: number;
    subcontracting_cost: number;
    tooling_cost: number;
    total_cost: number;
  };
  material_breakdown: {
    component_id: mongoose.Types.ObjectId;
    quantity: number;
    unit_cost: number;
    extended_cost: number;
    level: number;
  }[];
  labor_breakdown: {
    operation: string;
    work_center: string;
    hours: number;
    rate: number;
    cost: number;
  }[];
  overhead_rates: {
    fixed_overhead_pct: number;
    variable_overhead_pct: number;
    applied_base: 'labor' | 'material' | 'machine_hours';
  };
  effective_date: Date;
  status: 'draft' | 'frozen' | 'active';
  rolled_up_at: Date;
  created_by: mongoose.Types.ObjectId;
}

const costRollupSchema = new Schema<ICostRollup>(
  {
    tenant_id: { type: String, required: true, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    version: { type: Number, default: 1 },
    cost_components: {
      material_cost: { type: Number, default: 0 },
      labor_cost: { type: Number, default: 0 },
      overhead_cost: { type: Number, default: 0 },
      subcontracting_cost: { type: Number, default: 0 },
      tooling_cost: { type: Number, default: 0 },
      total_cost: { type: Number, default: 0 },
    },
    material_breakdown: [
      {
        component_id: { type: Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        unit_cost: Number,
        extended_cost: Number,
        level: Number,
      },
    ],
    labor_breakdown: [
      {
        operation: String,
        work_center: String,
        hours: Number,
        rate: Number,
        cost: Number,
      },
    ],
    overhead_rates: {
      fixed_overhead_pct: { type: Number, default: 0 },
      variable_overhead_pct: { type: Number, default: 0 },
      applied_base: { type: String, enum: ['labor', 'material', 'machine_hours'], default: 'labor' },
    },
    effective_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'frozen', 'active'], default: 'draft' },
    rolled_up_at: Date,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  defaultSchemaOptions
);

export const CostRollup = mongoose.model<ICostRollup>('CostRollup', costRollupSchema);

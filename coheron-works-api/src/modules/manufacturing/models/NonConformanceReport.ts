import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface INonConformanceReport extends Document {
  tenant_id: string;
  ncr_number: string;
  product_id: mongoose.Types.ObjectId;
  batch_number: string;
  mo_id: mongoose.Types.ObjectId;
  severity: 'critical' | 'major' | 'minor';
  category: 'material' | 'process' | 'design' | 'supplier';
  description: string;
  root_cause: string;
  root_cause_method: 'five_why' | 'fishbone' | 'pareto' | 'fmea';
  corrective_actions: {
    description: string;
    assignee_id: mongoose.Types.ObjectId;
    due_date: Date;
    status: 'open' | 'in_progress' | 'completed' | 'verified';
    completed_at?: Date;
  }[];
  preventive_actions: {
    description: string;
    assignee_id: mongoose.Types.ObjectId;
    due_date: Date;
    status: 'open' | 'in_progress' | 'completed' | 'verified';
  }[];
  disposition: 'use_as_is' | 'rework' | 'scrap' | 'return_to_supplier' | 'sort';
  quantity_affected: number;
  cost_impact: number;
  status: 'open' | 'investigating' | 'corrective_action' | 'closed';
  reported_by: mongoose.Types.ObjectId;
  closed_at?: Date;
}

const actionSchema = {
  description: { type: String, required: true },
  assignee_id: { type: Schema.Types.ObjectId, ref: 'User' },
  due_date: Date,
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'verified'], default: 'open' },
  completed_at: Date,
};

const ncrSchema = new Schema<INonConformanceReport>(
  {
    tenant_id: { type: String, required: true, index: true },
    ncr_number: { type: String, required: true, unique: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    batch_number: String,
    mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
    severity: { type: String, enum: ['critical', 'major', 'minor'], required: true },
    category: { type: String, enum: ['material', 'process', 'design', 'supplier'] },
    description: { type: String, required: true },
    root_cause: String,
    root_cause_method: { type: String, enum: ['five_why', 'fishbone', 'pareto', 'fmea'] },
    corrective_actions: [actionSchema],
    preventive_actions: [actionSchema],
    disposition: { type: String, enum: ['use_as_is', 'rework', 'scrap', 'return_to_supplier', 'sort'] },
    quantity_affected: { type: Number, default: 0 },
    cost_impact: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'investigating', 'corrective_action', 'closed'], default: 'open' },
    reported_by: { type: Schema.Types.ObjectId, ref: 'User' },
    closed_at: Date,
  },
  defaultSchemaOptions
);

export const NonConformanceReport = mongoose.model<INonConformanceReport>('NonConformanceReport', ncrSchema);

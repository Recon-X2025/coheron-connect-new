import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IInspectionPlan extends Document {
  tenant_id: string;
  name: string;
  product_id: mongoose.Types.ObjectId;
  inspection_type: 'incoming' | 'in_process' | 'final' | 'periodic';
  version: number;
  checkpoints: {
    name: string;
    characteristic: string;
    specification: string;
    tolerance_upper: number;
    tolerance_lower: number;
    uom: string;
    measurement_type: 'variable' | 'attribute';
    sampling_method: '100_pct' | 'aql' | 'skip_lot' | 'random';
    sample_size: number;
    instrument: string;
    is_critical: boolean;
  }[];
  linked_operations: string[];
  status: 'draft' | 'approved' | 'obsolete';
  approved_by: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
}

const inspectionPlanSchema = new Schema<IInspectionPlan>(
  {
    tenant_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    inspection_type: { type: String, enum: ['incoming', 'in_process', 'final', 'periodic'], required: true },
    version: { type: Number, default: 1 },
    checkpoints: [
      {
        name: { type: String, required: true },
        characteristic: String,
        specification: String,
        tolerance_upper: Number,
        tolerance_lower: Number,
        uom: String,
        measurement_type: { type: String, enum: ['variable', 'attribute'], default: 'variable' },
        sampling_method: { type: String, enum: ['100_pct', 'aql', 'skip_lot', 'random'], default: '100_pct' },
        sample_size: Number,
        instrument: String,
        is_critical: { type: Boolean, default: false },
      },
    ],
    linked_operations: [String],
    status: { type: String, enum: ['draft', 'approved', 'obsolete'], default: 'draft' },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  defaultSchemaOptions
);

export const InspectionPlan = mongoose.model<IInspectionPlan>('InspectionPlan', inspectionPlanSchema);

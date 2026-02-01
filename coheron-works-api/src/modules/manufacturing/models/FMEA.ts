import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IFMEA extends Document {
  tenant_id: string;
  name: string;
  product_id: mongoose.Types.ObjectId;
  process_or_design: 'process' | 'design';
  status: 'draft' | 'active' | 'closed';
  items: {
    process_step: string;
    potential_failure_mode: string;
    potential_effect: string;
    severity: number;
    potential_cause: string;
    occurrence: number;
    current_controls: string;
    detection: number;
    rpn: number;
    recommended_action: string;
    responsibility: string;
    target_date: Date;
    action_taken: string;
    new_severity: number;
    new_occurrence: number;
    new_detection: number;
    new_rpn: number;
  }[];
  created_by: mongoose.Types.ObjectId;
  reviewed_by: mongoose.Types.ObjectId;
  reviewed_at: Date;
}

const fmeaItemSchema = {
  process_step: String,
  potential_failure_mode: { type: String, required: true },
  potential_effect: String,
  severity: { type: Number, min: 1, max: 10, required: true },
  potential_cause: String,
  occurrence: { type: Number, min: 1, max: 10, required: true },
  current_controls: String,
  detection: { type: Number, min: 1, max: 10, required: true },
  rpn: { type: Number, default: 0 },
  recommended_action: String,
  responsibility: String,
  target_date: Date,
  action_taken: String,
  new_severity: Number,
  new_occurrence: Number,
  new_detection: Number,
  new_rpn: Number,
};

const fmeaSchema = new Schema<IFMEA>(
  {
    tenant_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    process_or_design: { type: String, enum: ['process', 'design'], required: true },
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
    items: [fmeaItemSchema],
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewed_at: Date,
  },
  defaultSchemaOptions
);

export const FMEA = mongoose.model<IFMEA>('FMEA', fmeaSchema);

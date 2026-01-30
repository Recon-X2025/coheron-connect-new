import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IDataBreach extends Document {
  tenant_id: mongoose.Types.ObjectId;
  detected_at: Date;
  reported_by?: mongoose.Types.ObjectId;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_records_count?: number;
  data_categories_affected: string[];
  notified_authority: boolean;
  authority_notified_at?: Date;
  notified_subjects: boolean;
  subjects_notified_at?: Date;
  remediation_steps?: string;
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const dataBreachSchema = new Schema<IDataBreach>({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  detected_at: { type: Date, required: true },
  reported_by: { type: Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
  },
  affected_records_count: { type: Number },
  data_categories_affected: [{ type: String }],
  notified_authority: { type: Boolean, default: false },
  authority_notified_at: { type: Date },
  notified_subjects: { type: Boolean, default: false },
  subjects_notified_at: { type: Date },
  remediation_steps: { type: String },
  status: {
    type: String,
    enum: ['detected', 'investigating', 'contained', 'resolved'],
    default: 'detected',
  },
  resolved_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

dataBreachSchema.index({ tenant_id: 1, status: 1 });

export const DataBreach = mongoose.model<IDataBreach>('DataBreach', dataBreachSchema);
export default DataBreach;

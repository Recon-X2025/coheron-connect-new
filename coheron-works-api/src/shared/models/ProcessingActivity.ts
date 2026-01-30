import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProcessingActivity extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  purpose: string;
  lawful_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  data_categories: string[];
  data_subjects: string[];
  recipients: string[];
  retention_period?: string;
  transfers_outside_eea: boolean;
  safeguards?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const processingActivitySchema = new Schema<IProcessingActivity>({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  purpose: { type: String, required: true },
  lawful_basis: {
    type: String,
    required: true,
    enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
  },
  data_categories: [{ type: String }],
  data_subjects: [{ type: String }],
  recipients: [{ type: String }],
  retention_period: { type: String },
  transfers_outside_eea: { type: Boolean, default: false },
  safeguards: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

processingActivitySchema.index({ tenant_id: 1, is_active: 1 });

export const ProcessingActivity = mongoose.model<IProcessingActivity>('ProcessingActivity', processingActivitySchema);
export default ProcessingActivity;

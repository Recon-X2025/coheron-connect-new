import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface INurtureEnrollment extends Document {
  tenant_id: mongoose.Types.ObjectId;
  sequence_id: mongoose.Types.ObjectId;
  lead_id: mongoose.Types.ObjectId;
  current_step: number;
  status: 'active' | 'completed' | 'exited' | 'paused';
  enrolled_at: Date;
  completed_at: Date;
  step_history: Array<{
    step_index: number;
    executed_at: Date;
    result: string;
  }>;
}

const nurtureEnrollmentSchema = new Schema<INurtureEnrollment>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  sequence_id: { type: Schema.Types.ObjectId, ref: 'NurtureSequence', required: true, index: true },
  lead_id: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  current_step: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'exited', 'paused'], default: 'active' },
  enrolled_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  step_history: [{
    step_index: { type: Number },
    executed_at: { type: Date, default: Date.now },
    result: { type: String },
  }],
}, defaultSchemaOptions);

nurtureEnrollmentSchema.index({ tenant_id: 1, sequence_id: 1 });
nurtureEnrollmentSchema.index({ lead_id: 1 });

export const NurtureEnrollment = mongoose.model<INurtureEnrollment>('NurtureEnrollment', nurtureEnrollmentSchema);

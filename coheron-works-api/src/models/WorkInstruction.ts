import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IQualityCheckpoint {
  check: string;
  tolerance: string;
  unit: string;
}

export interface IWorkInstructionStep {
  step_number: number;
  title: string;
  description: string;
  instruction_type: string;
  media_url: string;
  duration_minutes: number;
  tools_required: string[];
  safety_notes: string;
  quality_checkpoints: IQualityCheckpoint[];
}

export interface IWorkInstruction extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  version: number;
  product_id: mongoose.Types.ObjectId;
  operation_id: mongoose.Types.ObjectId;
  work_center_id: mongoose.Types.ObjectId;
  status: string;
  steps: IWorkInstructionStep[];
  total_duration_minutes: number;
  skill_level_required: string;
  language: string;
  tags: string[];
  approved_by: mongoose.Types.ObjectId;
  approved_at: Date;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}
const qualityCheckpointSchema = new Schema<IQualityCheckpoint>({
  check: { type: String },
  tolerance: { type: String },
  unit: { type: String },
}, { _id: false });

const stepSchema = new Schema<IWorkInstructionStep>({
  step_number: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String },
  instruction_type: { type: String, enum: ['text', 'image', 'video', 'checklist', 'warning', 'safety'], default: 'text' },
  media_url: { type: String },
  duration_minutes: { type: Number, default: 0 },
  tools_required: [{ type: String }],
  safety_notes: { type: String },
  quality_checkpoints: [qualityCheckpointSchema],
}, { _id: false });
const workInstructionSchema = new Schema<IWorkInstruction>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  version: { type: Number, default: 1 },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  operation_id: { type: Schema.Types.ObjectId },
  work_center_id: { type: Schema.Types.ObjectId, ref: 'Workcenter' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  steps: [stepSchema],
  total_duration_minutes: { type: Number, default: 0 },
  skill_level_required: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
  language: { type: String, default: 'en' },
  tags: [{ type: String }],
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

workInstructionSchema.index({ tenant_id: 1, product_id: 1 });
workInstructionSchema.index({ tenant_id: 1, operation_id: 1 });
workInstructionSchema.index({ tenant_id: 1, status: 1 });

export const WorkInstruction = mongoose.model<IWorkInstruction>('WorkInstruction', workInstructionSchema);
export default WorkInstruction;

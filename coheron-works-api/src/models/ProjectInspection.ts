import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IProjectInspection extends Document {
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  inspection_type: string;
  inspection_date: Date;
  inspector_id: mongoose.Types.ObjectId;
  findings?: string;
  acceptance_criteria?: string;
  sign_off_required: boolean;
  non_conformities?: string;
  corrective_actions?: string;
  status: string;
  signed_off_by?: mongoose.Types.ObjectId;
  signed_off_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const projectInspectionSchema = new Schema<IProjectInspection>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  inspection_type: { type: String, required: true },
  inspection_date: { type: Date, required: true },
  inspector_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  findings: { type: String },
  acceptance_criteria: { type: String },
  sign_off_required: { type: Boolean, default: false },
  non_conformities: { type: String },
  corrective_actions: { type: String },
  status: { type: String, default: 'scheduled' },
  signed_off_by: { type: Schema.Types.ObjectId, ref: 'User' },
  signed_off_at: { type: Date },
}, defaultSchemaOptions);

// Indexes
projectInspectionSchema.index({ project_id: 1 });
projectInspectionSchema.index({ task_id: 1 });
projectInspectionSchema.index({ inspector_id: 1 });
projectInspectionSchema.index({ status: 1 });
projectInspectionSchema.index({ project_id: 1, status: 1 });
projectInspectionSchema.index({ inspection_date: -1 });
projectInspectionSchema.index({ signed_off_by: 1 });
projectInspectionSchema.index({ created_at: -1 });

export default mongoose.model<IProjectInspection>('ProjectInspection', projectInspectionSchema);

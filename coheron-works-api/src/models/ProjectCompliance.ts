import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectCompliance extends Document {
  project_id: mongoose.Types.ObjectId;
  template_id: mongoose.Types.ObjectId;
  compliance_status: string;
  last_audit_date?: Date;
  next_audit_date?: Date;
  audit_notes?: string;
  created_at: Date;
  updated_at: Date;
}

const projectComplianceSchema = new Schema<IProjectCompliance>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  template_id: { type: Schema.Types.ObjectId, ref: 'ComplianceTemplate', required: true },
  compliance_status: { type: String, default: 'not_started' },
  last_audit_date: { type: Date },
  next_audit_date: { type: Date },
  audit_notes: { type: String },
}, defaultSchemaOptions);

// Indexes
projectComplianceSchema.index({ project_id: 1 });
projectComplianceSchema.index({ template_id: 1 });
projectComplianceSchema.index({ compliance_status: 1 });
projectComplianceSchema.index({ project_id: 1, compliance_status: 1 });
projectComplianceSchema.index({ next_audit_date: 1 });
projectComplianceSchema.index({ created_at: -1 });

export default mongoose.models.ProjectCompliance as mongoose.Model<IProjectCompliance> || mongoose.model<IProjectCompliance>('ProjectCompliance', projectComplianceSchema);

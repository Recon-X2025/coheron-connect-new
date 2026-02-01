import mongoose, { Schema, Document } from 'mongoose';

export interface IComplianceAuditFinding {
  control_id: string;
  finding_type: string;
  severity: string;
  description: string;
  recommendation: string;
  remediation_plan: string;
  remediation_due_date: Date;
  remediation_status: string;
  closed_at: Date;
}

export interface IComplianceAudit extends Document {
  tenant_id: mongoose.Types.ObjectId;
  framework: string;
  audit_type: string;
  audit_name: string;
  auditor_name: string;
  auditor_company: string;
  start_date: Date;
  end_date: Date;
  status: string;
  findings: IComplianceAuditFinding[];
  total_controls_assessed: number;
  controls_passed: number;
  controls_failed: number;
  compliance_score_pct: number;
  report_url: string;
  summary: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const findingSchema = new Schema({
  control_id: { type: String, required: true },
  finding_type: { type: String, enum: ['observation', 'non_conformity', 'opportunity'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  description: { type: String, required: true },
  recommendation: { type: String },
  remediation_plan: { type: String },
  remediation_due_date: { type: Date },
  remediation_status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
  closed_at: { type: Date },
}, { _id: false });

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const complianceAuditSchema = new Schema<IComplianceAudit>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, ref: 'Tenant' },
  framework: { type: String, required: true, enum: ['soc2','iso27001','gdpr','hipaa','pci_dss','nis2'] },
  audit_type: { type: String, required: true, enum: ['internal','external','self_assessment'] },
  audit_name: { type: String, required: true },
  auditor_name: { type: String },
  auditor_company: { type: String },
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  status: { type: String, default: 'planned', enum: ['planned','in_progress','completed','remediation'] },
  findings: [findingSchema],
  total_controls_assessed: { type: Number, default: 0 },
  controls_passed: { type: Number, default: 0 },
  controls_failed: { type: Number, default: 0 },
  compliance_score_pct: { type: Number, default: 0 },
  report_url: { type: String },
  summary: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

complianceAuditSchema.index({ tenant_id: 1, framework: 1, start_date: 1 });
complianceAuditSchema.index({ tenant_id: 1, status: 1 });

export const ComplianceAudit = mongoose.model<IComplianceAudit>('ComplianceAudit', complianceAuditSchema);

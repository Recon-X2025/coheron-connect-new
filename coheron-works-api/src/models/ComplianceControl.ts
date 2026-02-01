import mongoose, { Schema, Document } from 'mongoose';

export interface IComplianceControl extends Document {
  tenant_id: mongoose.Types.ObjectId;
  framework: string;
  control_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  evidence_required: string;
  evidence_urls: string[];
  assigned_to: mongoose.Types.ObjectId;
  review_frequency: string;
  last_reviewed_at: Date;
  next_review_at: Date;
  reviewer_id: mongoose.Types.ObjectId;
  reviewer_notes: string;
  risk_level: string;
  implementation_notes: string;
  created_at: Date;
  updated_at: Date;
}

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const complianceControlSchema = new Schema<IComplianceControl>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, ref: 'Tenant' },
  framework: { type: String, required: true, enum: ['soc2', 'iso27001', 'gdpr', 'hipaa', 'pci_dss', 'nis2'] },
  control_id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  status: { type: String, default: 'not_started', enum: ['not_started', 'in_progress', 'implemented', 'verified', 'non_compliant'] },
  evidence_required: { type: String },
  evidence_urls: [{ type: String }],
  assigned_to: { type: Schema.Types.ObjectId, ref: 'Employee' },
  review_frequency: { type: String, enum: ['monthly', 'quarterly', 'annually'] },
  last_reviewed_at: { type: Date },
  next_review_at: { type: Date },
  reviewer_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  reviewer_notes: { type: String },
  risk_level: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  implementation_notes: { type: String },
}, schemaOptions);

complianceControlSchema.index({ tenant_id: 1, framework: 1, control_id: 1 }, { unique: true });
complianceControlSchema.index({ tenant_id: 1, framework: 1, status: 1 });

export const ComplianceControl = mongoose.model<IComplianceControl>('ComplianceControl', complianceControlSchema);

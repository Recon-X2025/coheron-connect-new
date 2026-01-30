import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IComplianceTemplate extends Document {
  template_name: string;
  compliance_standard: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const complianceTemplateSchema = new Schema<IComplianceTemplate>({
  template_name: { type: String, required: true },
  compliance_standard: { type: String, required: true },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
complianceTemplateSchema.index({ compliance_standard: 1 });
complianceTemplateSchema.index({ is_active: 1 });

export default mongoose.model<IComplianceTemplate>('ComplianceTemplate', complianceTemplateSchema);

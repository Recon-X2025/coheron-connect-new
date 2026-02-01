import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

const approvalConditionSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true, enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'contains', 'in'] },
  value: { type: Schema.Types.Mixed, required: true },
});

const approvalLevelSchema = new Schema({
  level: { type: Number, required: true },
  approver_type: { type: String, required: true, enum: ['user', 'role', 'manager', 'department_head'] },
  approver_id: { type: Schema.Types.ObjectId },
  approver_role: { type: String },
  required: { type: Boolean, default: true },
});

export interface IApprovalRule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  document_type: string;
  name: string;
  description: string;
  conditions: any[];
  levels: any[];
  is_active: boolean;
}

const approvalRuleSchema = new Schema<IApprovalRule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  document_type: { type: String, required: true, enum: ['purchase_order', 'sale_order', 'invoice', 'expense', 'payroll', 'journal_entry', 'leave_request', 'quotation'] },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  conditions: [approvalConditionSchema],
  levels: [approvalLevelSchema],
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

approvalRuleSchema.index({ tenant_id: 1, document_type: 1 });

const ApprovalRuleModel = mongoose.model<IApprovalRule>('ApprovalRule', approvalRuleSchema);
export { ApprovalRuleModel as ApprovalRule };
export default ApprovalRuleModel;

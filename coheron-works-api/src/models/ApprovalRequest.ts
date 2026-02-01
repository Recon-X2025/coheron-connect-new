import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

const approvalDecisionSchema = new Schema({
  level: { type: Number, required: true },
  approver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  comment: { type: String, default: '' },
  decided_at: { type: Date },
});

export interface IApprovalRequest extends Document {
  tenant_id: mongoose.Types.ObjectId;
  rule_id: mongoose.Types.ObjectId;
  document_type: string;
  document_id: mongoose.Types.ObjectId;
  status: string;
  current_level: number;
  approvals: any[];
  requested_by: mongoose.Types.ObjectId;
}

const approvalRequestSchema = new Schema<IApprovalRequest>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  rule_id: { type: Schema.Types.ObjectId, ref: 'ApprovalRule', required: true },
  document_type: { type: String, required: true },
  document_id: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
  current_level: { type: Number, default: 1 },
  approvals: [approvalDecisionSchema],
  requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, defaultSchemaOptions);

approvalRequestSchema.index({ tenant_id: 1, document_type: 1, document_id: 1 });
approvalRequestSchema.index({ tenant_id: 1, status: 1 });
approvalRequestSchema.index({ 'approvals.approver_id': 1, 'approvals.status': 1 });

const ApprovalRequestModel = mongoose.model<IApprovalRequest>('ApprovalRequest', approvalRequestSchema);
export { ApprovalRequestModel as ApprovalRequest };
export default ApprovalRequestModel;

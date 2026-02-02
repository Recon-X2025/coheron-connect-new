import mongoose, { Schema, Document } from 'mongoose';

export interface ISagaApprovalGate extends Document {
  tenant_id: string;
  saga_instance_id: string;
  saga_name: string;
  step_name: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  requested_by: string;
  approval_roles: string[];
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  decided_by: string | null;
  decision_note: string | null;
  decided_at: Date | null;
  timeout_at: Date;
  timeout_action: 'approve' | 'reject' | 'escalate';
  escalated_to: string | null;
  escalation_level: number;
  context: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const SagaApprovalGateSchema = new Schema<ISagaApprovalGate>(
  {
    tenant_id: { type: String, required: true, index: true },
    saga_instance_id: { type: String, required: true, index: true },
    saga_name: { type: String, required: true },
    step_name: { type: String, required: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    requested_by: { type: String, default: '' },
    approval_roles: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'escalated', 'expired'],
      default: 'pending',
      index: true,
    },
    decided_by: { type: String, default: null },
    decision_note: { type: String, default: null },
    decided_at: { type: Date, default: null },
    timeout_at: { type: Date, required: true },
    timeout_action: { type: String, enum: ['approve', 'reject', 'escalate'], default: 'escalate' },
    escalated_to: { type: String, default: null },
    escalation_level: { type: Number, default: 0 },
    context: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

SagaApprovalGateSchema.index({ tenant_id: 1, status: 1 });
SagaApprovalGateSchema.index({ status: 1, timeout_at: 1 });

export default mongoose.model<ISagaApprovalGate>('SagaApprovalGate', SagaApprovalGateSchema);

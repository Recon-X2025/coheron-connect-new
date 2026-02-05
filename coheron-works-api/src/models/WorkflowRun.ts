import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const stepSchema = new Schema({
  action_id: { type: Schema.Types.ObjectId },
  action_type: { type: String },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'], default: 'pending' },
  started_at: { type: Date },
  completed_at: { type: Date },
  result: { type: Schema.Types.Mixed },
  error: { type: String },
}, { _id: true });

export interface IWorkflowRun extends Document {
  workflow_id: mongoose.Types.ObjectId;
  trigger_record_id: mongoose.Types.ObjectId;
  status: string;
  tenant_id: mongoose.Types.ObjectId;
}

const workflowRunSchema = new Schema({
  workflow_id: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
  trigger_record_id: { type: Schema.Types.ObjectId },
  status: { type: String, enum: ['running', 'completed', 'failed', 'cancelled'], default: 'running' },
  steps: [stepSchema],
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
}, schemaOptions);

workflowRunSchema.index({ workflow_id: 1 });
workflowRunSchema.index({ tenant_id: 1, status: 1 });
workflowRunSchema.index({ trigger_record_id: 1 });

export const WorkflowRun = mongoose.models.WorkflowRun || mongoose.model('WorkflowRun', workflowRunSchema);
export default WorkflowRun;

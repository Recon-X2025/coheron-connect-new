import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IWorkflowExecution extends Document {
  tenant_id: mongoose.Types.ObjectId;
  workflow_id: mongoose.Types.ObjectId;
  triggered_by: mongoose.Types.ObjectId;
  trigger_record_id: string;
  status: string;
  started_at: Date;
  completed_at: Date;
  duration_ms: number;
  execution_path: Array<{
    node_id: string;
    entered_at: Date;
    exited_at: Date;
    result: any;
  }>;
  error_message: string;
  variables_snapshot: any;
}

const WorkflowExecutionSchema = new Schema<IWorkflowExecution>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  workflow_id: { type: Schema.Types.ObjectId, ref: 'VisualWorkflow', required: true, index: true },
  triggered_by: { type: Schema.Types.ObjectId },
  trigger_record_id: String,
  status: { type: String, enum: ['running', 'completed', 'failed', 'waiting'], default: 'running' },
  started_at: { type: Date, default: Date.now },
  completed_at: Date,
  duration_ms: Number,
  execution_path: [{
    node_id: { type: String, required: true },
    entered_at: Date,
    exited_at: Date,
    result: Schema.Types.Mixed,
  }],
  error_message: String,
  variables_snapshot: Schema.Types.Mixed,
}, defaultSchemaOptions);

export default mongoose.model<IWorkflowExecution>('WorkflowExecution', WorkflowExecutionSchema);

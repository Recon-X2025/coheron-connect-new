import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IFlowExecution extends Document {
  tenant_id: mongoose.Types.ObjectId;
  flow_id: mongoose.Types.ObjectId;
  lead_id: mongoose.Types.ObjectId;
  status: 'running' | 'completed' | 'failed' | 'paused';
  current_node_id: string;
  started_at: Date;
  completed_at: Date;
  execution_log: Array<{
    node_id: string;
    action: string;
    result: string;
    timestamp: Date;
  }>;
}

const flowExecutionSchema = new Schema<IFlowExecution>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  flow_id: { type: Schema.Types.ObjectId, ref: 'AutomationFlow', required: true, index: true },
  lead_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  status: { type: String, enum: ['running', 'completed', 'failed', 'paused'], default: 'running' },
  current_node_id: { type: String },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  execution_log: [{
    node_id: { type: String },
    action: { type: String },
    result: { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
}, defaultSchemaOptions);

flowExecutionSchema.index({ tenant_id: 1, flow_id: 1 });

export const FlowExecution = mongoose.model<IFlowExecution>('FlowExecution', flowExecutionSchema);

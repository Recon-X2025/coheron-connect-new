import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IVisualWorkflow extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: string;
  object_type: string;
  trigger_config: {
    event?: string;
    conditions?: any;
    schedule_cron?: string;
  };
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    config: any;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    condition?: any;
  }>;
  variables: Array<{
    name: string;
    type: string;
    default_value?: any;
  }>;
  status: string;
  version: number;
  execution_count: number;
  avg_execution_ms: number;
  error_count: number;
  last_executed_at: Date;
  created_by: mongoose.Types.ObjectId;
}

const VisualWorkflowSchema = new Schema<IVisualWorkflow>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['record_triggered', 'scheduled', 'platform_event', 'approval', 'screen_flow'], required: true },
  object_type: { type: String, default: '' },
  trigger_config: {
    event: { type: String, enum: ['create', 'update', 'delete'] },
    conditions: Schema.Types.Mixed,
    schedule_cron: String,
  },
  nodes: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['start', 'action', 'decision', 'loop', 'assignment', 'approval', 'subflow', 'screen', 'wait', 'collection_filter', 'collection_sort'], required: true },
    label: { type: String, required: true },
    position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
    config: Schema.Types.Mixed,
  }],
  edges: [{
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    label: String,
    condition: Schema.Types.Mixed,
  }],
  variables: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'boolean', 'date', 'record', 'collection'], required: true },
    default_value: Schema.Types.Mixed,
  }],
  status: { type: String, enum: ['draft', 'active', 'inactive', 'error'], default: 'draft' },
  version: { type: Number, default: 1 },
  execution_count: { type: Number, default: 0 },
  avg_execution_ms: { type: Number, default: 0 },
  error_count: { type: Number, default: 0 },
  last_executed_at: Date,
  created_by: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

export default (mongoose.models.VisualWorkflow as mongoose.Model<IVisualWorkflow>) || mongoose.model<IVisualWorkflow>('VisualWorkflow', VisualWorkflowSchema);

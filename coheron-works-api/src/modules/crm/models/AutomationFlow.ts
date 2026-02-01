import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IAutomationFlow extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused';
  trigger: {
    type: 'lead_created' | 'lead_updated' | 'deal_stage_changed' | 'score_threshold' | 'time_based' | 'form_submitted' | 'email_opened' | 'email_clicked';
    config: any;
  };
  nodes: Array<{
    id: string;
    type: 'condition' | 'action' | 'delay' | 'split';
    position: { x: number; y: number };
    config: any;
    next_nodes: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
  }>;
  execution_count: number;
  last_triggered_at: Date;
  created_by: mongoose.Types.ObjectId;
  version: number;
}

const automationFlowSchema = new Schema<IAutomationFlow>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'paused'], default: 'draft' },
  trigger: {
    type: { type: String, enum: ['lead_created', 'lead_updated', 'deal_stage_changed', 'score_threshold', 'time_based', 'form_submitted', 'email_opened', 'email_clicked'] },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  nodes: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['condition', 'action', 'delay', 'split'] },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    config: { type: Schema.Types.Mixed, default: {} },
    next_nodes: [{ type: String }],
  }],
  edges: [{
    source: { type: String },
    target: { type: String },
    label: { type: String, default: '' },
  }],
  execution_count: { type: Number, default: 0 },
  last_triggered_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 },
}, defaultSchemaOptions);

automationFlowSchema.index({ tenant_id: 1, status: 1 });

export const AutomationFlow = mongoose.model<IAutomationFlow>('AutomationFlow', automationFlowSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ISupportTrigger extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  trigger_event: string;
  conditions: {
    all: { field: string; operator: string; value: any }[];
    any: { field: string; operator: string; value: any }[];
  };
  actions: { type: string; config: any }[];
  is_active: boolean;
  priority: number;
  execution_count: number;
  last_triggered_at?: Date;
  created_by: mongoose.Types.ObjectId;
}

const conditionSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true, enum: ['is', 'is_not', 'contains', 'not_contains', 'greater_than', 'less_than', 'changed_to', 'changed_from'] },
  value: { type: Schema.Types.Mixed, required: true },
}, { _id: false });

const actionSchema = new Schema({
  type: { type: String, required: true, enum: ['set_priority', 'set_status', 'assign_to', 'add_tag', 'remove_tag', 'send_email', 'send_notification', 'add_internal_note', 'escalate', 'trigger_webhook', 'set_custom_field', 'add_cc', 'remove_cc'] },
  config: { type: Schema.Types.Mixed },
}, { _id: false });

const supportTriggerSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  trigger_event: { type: String, required: true, enum: ['ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_commented', 'ticket_reopened', 'sla_warning', 'sla_breached', 'customer_replied', 'agent_replied', 'rating_submitted'] },
  conditions: {
    all: [conditionSchema],
    any: [conditionSchema],
  },
  actions: [actionSchema],
  is_active: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  execution_count: { type: Number, default: 0 },
  last_triggered_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

supportTriggerSchema.index({ tenant_id: 1, trigger_event: 1 });
supportTriggerSchema.index({ tenant_id: 1, is_active: 1, priority: 1 });

export const SupportTrigger = mongoose.model<ISupportTrigger>('SupportTrigger', supportTriggerSchema);
export default SupportTrigger;

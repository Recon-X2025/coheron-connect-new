import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const conditionSchema = new Schema({
  field: { type: String },
  operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'] },
  value: { type: Schema.Types.Mixed },
}, { _id: false });

const actionSchema = new Schema({
  type: { type: String, enum: ['update_field', 'send_email', 'send_notification', 'assign', 'create_task', 'webhook', 'wait', 'delay', 'condition', 'loop', 'stop', 'send_sms', 'send_whatsapp', 'send_slack'] },
  config: { type: Schema.Types.Mixed },
  order: { type: Number, default: 0 },
}, { _id: true });

export interface IWorkflow extends Document {
  name: string;
  module: string;
  is_active: boolean;
  tenant_id: mongoose.Types.ObjectId;
}

const workflowSchema = new Schema({
  name: { type: String, required: true },
  module: { type: String, required: true },
  trigger: {
    type: { type: String, enum: ['on_create', 'on_update', 'on_field_change', 'on_schedule', 'on_delete', 'on_webhook'] },
    entity: { type: String },
    field: { type: String },
    schedule: { type: String },
  },
  // --- Schedule configuration ---
  schedule_config: {
    frequency: { type: String, enum: ['once', 'hourly', 'daily', 'weekly', 'monthly', 'cron'] },
    timezone: { type: String, default: 'Asia/Kolkata' },
    cron_expression: { type: String },
    next_run_at: { type: Date },
    last_run_at: { type: Date },
  },
  // --- Webhook configuration ---
  webhook_config: {
    url: { type: String },
    method: { type: String, enum: ['GET', 'POST', 'PUT'], default: 'POST' },
    headers: { type: Schema.Types.Mixed },
    secret: { type: String },
  },
  // --- Execution stats ---
  execution_count: { type: Number, default: 0 },
  last_executed_at: { type: Date },
  last_execution_status: { type: String, enum: ['success', 'failure', 'partial'] },
  conditions: [conditionSchema],
  actions: [actionSchema],
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
}, schemaOptions);

workflowSchema.index({ tenant_id: 1 });
workflowSchema.index({ tenant_id: 1, module: 1 });
workflowSchema.index({ tenant_id: 1, is_active: 1 });

export const Workflow = mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);
export default Workflow;

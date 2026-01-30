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
  type: { type: String, enum: ['update_field', 'send_email', 'send_notification', 'assign', 'create_task', 'webhook', 'wait'] },
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
    type: { type: String, enum: ['on_create', 'on_update', 'on_field_change', 'on_schedule', 'on_delete'] },
    entity: { type: String },
    field: { type: String },
    schedule: { type: String },
  },
  conditions: [conditionSchema],
  actions: [actionSchema],
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
}, schemaOptions);

workflowSchema.index({ tenant_id: 1 });
workflowSchema.index({ tenant_id: 1, module: 1 });
workflowSchema.index({ tenant_id: 1, is_active: 1 });

export const Workflow = mongoose.model('Workflow', workflowSchema);
export default Workflow;

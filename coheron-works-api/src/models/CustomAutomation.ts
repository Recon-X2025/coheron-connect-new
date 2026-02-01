import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const conditionSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'] },
  value: { type: Schema.Types.Mixed }
}, { _id: false });

const actionSchema = new Schema({
  action_type: { type: String, required: true, enum: ['set_field', 'send_email', 'send_notification', 'create_record', 'update_record', 'webhook'] },
  config: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const customAutomationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  description: { type: String },
  entity_type: { type: String, required: true },
  trigger_type: { type: String, required: true, enum: ['on_create', 'on_update', 'on_delete', 'on_field_change', 'scheduled', 'manual'] },
  trigger_config: { type: Schema.Types.Mixed, default: {} },
  conditions: [conditionSchema],
  actions: [actionSchema],
  is_active: { type: Boolean, default: true },
  run_count: { type: Number, default: 0 },
  last_run_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId }
}, schemaOptions);

customAutomationSchema.index({ tenant_id: 1, entity_type: 1, trigger_type: 1, is_active: 1 });

export const CustomAutomation = mongoose.model('CustomAutomation', customAutomationSchema);

import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const crmTaskSchema = new Schema({
  name: { type: String },
  description: { type: String },
  task_type: { type: String, default: 'task' },
  priority: { type: String, default: 'medium' },
  state: { type: String, default: 'pending' },
  assigned_to_id: { type: Schema.Types.ObjectId, ref: 'User' },
  created_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
  due_date: { type: Date },
  related_model: { type: String },
  related_id: { type: Schema.Types.ObjectId },
  reminder_date: { type: Date },
}, schemaOptions);

const calendarEventSchema = new Schema({
  title: { type: String },
  description: { type: String },
  event_type: { type: String, default: 'meeting' },
  start_date: { type: Date },
  start_time: { type: String },
  end_date: { type: Date },
  end_time: { type: String },
  all_day: { type: Boolean, default: false },
  location: { type: String },
  organizer_id: { type: Schema.Types.ObjectId, ref: 'User' },
  attendee_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  related_model: { type: String },
  related_id: { type: Schema.Types.ObjectId },
  reminder_minutes: { type: Number },
  created_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

const crmAutomationWorkflowSchema = new Schema({
  name: { type: String },
  description: { type: String },
  trigger_type: { type: String },
  trigger_config: { type: Schema.Types.Mixed },
  actions: { type: Schema.Types.Mixed },
  conditions: { type: Schema.Types.Mixed },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// CrmTask indexes
crmTaskSchema.index({ state: 1 });
crmTaskSchema.index({ assigned_to_id: 1 });
crmTaskSchema.index({ created_by_id: 1 });
crmTaskSchema.index({ related_id: 1 });
crmTaskSchema.index({ due_date: -1 });
crmTaskSchema.index({ task_type: 1 });
crmTaskSchema.index({ assigned_to_id: 1, state: 1 });

// CalendarEvent indexes
calendarEventSchema.index({ organizer_id: 1 });
calendarEventSchema.index({ created_by_id: 1 });
calendarEventSchema.index({ related_id: 1 });
calendarEventSchema.index({ start_date: -1 });
calendarEventSchema.index({ event_type: 1 });

// CrmAutomationWorkflow indexes
crmAutomationWorkflowSchema.index({ is_active: 1 });
crmAutomationWorkflowSchema.index({ trigger_type: 1 });

export const CrmTask = mongoose.model('CrmTask', crmTaskSchema);
export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
export const CrmAutomationWorkflow = mongoose.model('CrmAutomationWorkflow', crmAutomationWorkflowSchema);

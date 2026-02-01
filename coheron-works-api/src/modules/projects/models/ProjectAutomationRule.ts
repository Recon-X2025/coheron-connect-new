import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IProjectAutomationRule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
  is_active: boolean;
  execution_count: number;
  last_triggered_at: Date;
  created_by: mongoose.Types.ObjectId;
}

const projectAutomationRuleSchema = new Schema<IProjectAutomationRule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  description: { type: String },
  trigger_type: {
    type: String,
    enum: ['task_created', 'task_status_changed', 'task_assigned', 'due_date_passed', 'sprint_started', 'sprint_ended'],
    required: true,
  },
  trigger_config: { type: Schema.Types.Mixed, default: {} },
  action_type: {
    type: String,
    enum: ['assign_user', 'change_status', 'send_notification', 'add_label', 'move_to_sprint'],
    required: true,
  },
  action_config: { type: Schema.Types.Mixed, default: {} },
  is_active: { type: Boolean, default: true },
  execution_count: { type: Number, default: 0 },
  last_triggered_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

projectAutomationRuleSchema.index({ tenant_id: 1, project_id: 1 });
projectAutomationRuleSchema.index({ tenant_id: 1, is_active: 1 });

export const ProjectAutomationRule = mongoose.model<IProjectAutomationRule>('ProjectAutomationRule', projectAutomationRuleSchema);

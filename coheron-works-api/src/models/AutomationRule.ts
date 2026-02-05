import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IAutomationRule extends Document {
  project_id: mongoose.Types.ObjectId;
  rule_name: string;
  trigger_condition: string;
  action_type: string;
  action_params?: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const automationRuleSchema = new Schema<IAutomationRule>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  rule_name: { type: String, required: true },
  trigger_condition: { type: String, required: true },
  action_type: { type: String, required: true },
  action_params: { type: Schema.Types.Mixed },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
automationRuleSchema.index({ project_id: 1 });
automationRuleSchema.index({ is_active: 1 });
automationRuleSchema.index({ project_id: 1, is_active: 1 });

export default mongoose.models.AutomationRule as mongoose.Model<IAutomationRule> || mongoose.model<IAutomationRule>('AutomationRule', automationRuleSchema);

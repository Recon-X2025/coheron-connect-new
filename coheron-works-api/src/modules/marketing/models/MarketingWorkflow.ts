import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IMarketingWorkflow extends Document {
  tenant_id: string;
  name: string;
  trigger_type: 'form_submit' | 'page_view' | 'email_open' | 'email_click' | 'list_join' | 'property_change' | 'score_change' | 'date';
  trigger_config: any;
  actions: Array<{
    order: number;
    type: 'send_email' | 'add_tag' | 'remove_tag' | 'add_to_list' | 'remove_from_list' | 'update_property' | 'notify_user' | 'create_task' | 'delay' | 'if_then';
    config: any;
  }>;
  is_active: boolean;
  execution_count: number;
  created_by?: string;
}

const marketingWorkflowSchema = new Schema<IMarketingWorkflow>({
  tenant_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  trigger_type: { type: String, enum: ['form_submit', 'page_view', 'email_open', 'email_click', 'list_join', 'property_change', 'score_change', 'date'], required: true },
  trigger_config: Schema.Types.Mixed,
  actions: [{
    order: { type: Number, required: true },
    type: { type: String, enum: ['send_email', 'add_tag', 'remove_tag', 'add_to_list', 'remove_from_list', 'update_property', 'notify_user', 'create_task', 'delay', 'if_then'], required: true },
    config: Schema.Types.Mixed,
  }],
  is_active: { type: Boolean, default: false },
  execution_count: { type: Number, default: 0 },
  created_by: String,
}, defaultSchemaOptions);

export const MarketingWorkflow = mongoose.model<IMarketingWorkflow>('MarketingWorkflow', marketingWorkflowSchema);

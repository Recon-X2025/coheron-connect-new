import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IJourney extends Document {
  tenant_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  trigger: {
    type: 'list_membership' | 'form_submit' | 'event_registration' | 'tag_added' | 'date_based' | 'api';
    config: any;
  };
  nodes: Array<{
    id: string;
    type: 'email' | 'sms' | 'whatsapp' | 'wait' | 'condition' | 'ab_split' | 'update_property' | 'add_to_list' | 'remove_from_list' | 'webhook' | 'internal_notification';
    position: { x: number; y: number };
    config: any;
    stats: { entered: number; completed: number; failed: number };
  }>;
  edges: Array<{ source: string; target: string; label?: string }>;
  goal?: {
    type: 'email_click' | 'page_visit' | 'form_submit' | 'tag_added' | 'deal_created';
    target_count?: number;
  };
  enrolled_count: number;
  goal_achieved_count: number;
  conversion_rate: number;
  created_by?: string;
}

const journeySchema = new Schema<IJourney>({
  tenant_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed'], default: 'draft' },
  trigger: {
    type: { type: String, enum: ['list_membership', 'form_submit', 'event_registration', 'tag_added', 'date_based', 'api'], required: true },
    config: Schema.Types.Mixed,
  },
  nodes: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['email', 'sms', 'whatsapp', 'wait', 'condition', 'ab_split', 'update_property', 'add_to_list', 'remove_from_list', 'webhook', 'internal_notification'], required: true },
    position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
    config: Schema.Types.Mixed,
    stats: { entered: { type: Number, default: 0 }, completed: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
  }],
  edges: [{ source: String, target: String, label: String }],
  goal: {
    type: { type: String, enum: ['email_click', 'page_visit', 'form_submit', 'tag_added', 'deal_created'] },
    target_count: Number,
  },
  enrolled_count: { type: Number, default: 0 },
  goal_achieved_count: { type: Number, default: 0 },
  conversion_rate: { type: Number, default: 0 },
  created_by: String,
}, defaultSchemaOptions);

journeySchema.index({ tenant_id: 1, status: 1 });

export const Journey = mongoose.model<IJourney>('Journey', journeySchema);

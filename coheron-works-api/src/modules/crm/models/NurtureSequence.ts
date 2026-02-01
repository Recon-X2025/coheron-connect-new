import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface INurtureSequence extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused';
  target_segment: { filters: any };
  steps: Array<{
    order: number;
    type: 'email' | 'wait' | 'condition' | 'task' | 'sms' | 'whatsapp';
    delay_days: number;
    delay_hours: number;
    config: {
      subject?: string;
      body?: string;
      template_id?: string;
      condition_field?: string;
      condition_operator?: string;
      condition_value?: string;
      task_title?: string;
      task_assignee?: mongoose.Types.ObjectId;
    };
    sent_count: number;
    open_rate: number;
    click_rate: number;
  }>;
  enrolled_count: number;
  completed_count: number;
  conversion_rate: number;
  created_by: mongoose.Types.ObjectId;
}

const nurtureSequenceSchema = new Schema<INurtureSequence>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'paused'], default: 'draft' },
  target_segment: {
    filters: { type: Schema.Types.Mixed, default: {} },
  },
  steps: [{
    order: { type: Number, required: true },
    type: { type: String, enum: ['email', 'wait', 'condition', 'task', 'sms', 'whatsapp'] },
    delay_days: { type: Number, default: 0 },
    delay_hours: { type: Number, default: 0 },
    config: {
      subject: { type: String },
      body: { type: String },
      template_id: { type: String },
      condition_field: { type: String },
      condition_operator: { type: String },
      condition_value: { type: String },
      task_title: { type: String },
      task_assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    sent_count: { type: Number, default: 0 },
    open_rate: { type: Number, default: 0 },
    click_rate: { type: Number, default: 0 },
  }],
  enrolled_count: { type: Number, default: 0 },
  completed_count: { type: Number, default: 0 },
  conversion_rate: { type: Number, default: 0 },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

nurtureSequenceSchema.index({ tenant_id: 1, status: 1 });

export const NurtureSequence = mongoose.model<INurtureSequence>('NurtureSequence', nurtureSequenceSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IEmailTemplateV2 extends Document {
  tenant_id: string;
  name: string;
  category: 'newsletter' | 'promotional' | 'transactional' | 'automated' | 'event';
  subject: string;
  preview_text?: string;
  blocks: Array<{
    id: string;
    type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'social' | 'video' | 'product_card' | 'countdown';
    content: any;
    styles: any;
    order: number;
  }>;
  global_styles: {
    font_family?: string;
    primary_color?: string;
    background_color?: string;
    text_color?: string;
    link_color?: string;
    border_radius?: number;
  };
  thumbnail_url?: string;
  is_published: boolean;
  tags: string[];
  open_rate: number;
  click_rate: number;
  usage_count: number;
  created_by?: string;
}

const emailTemplateV2Schema = new Schema<IEmailTemplateV2>({
  tenant_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['newsletter', 'promotional', 'transactional', 'automated', 'event'], default: 'newsletter' },
  subject: { type: String, default: '' },
  preview_text: String,
  blocks: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['header', 'text', 'image', 'button', 'divider', 'columns', 'social', 'video', 'product_card', 'countdown'], required: true },
    content: Schema.Types.Mixed,
    styles: Schema.Types.Mixed,
    order: { type: Number, default: 0 },
  }],
  global_styles: {
    font_family: { type: String, default: 'Arial, sans-serif' },
    primary_color: { type: String, default: '#00C971' },
    background_color: { type: String, default: '#ffffff' },
    text_color: { type: String, default: '#333333' },
    link_color: { type: String, default: '#00C971' },
    border_radius: { type: Number, default: 4 },
  },
  thumbnail_url: String,
  is_published: { type: Boolean, default: false },
  tags: [String],
  open_rate: { type: Number, default: 0 },
  click_rate: { type: Number, default: 0 },
  usage_count: { type: Number, default: 0 },
  created_by: String,
}, defaultSchemaOptions);

export const EmailTemplateV2 = mongoose.model<IEmailTemplateV2>('EmailTemplateV2', emailTemplateV2Schema);

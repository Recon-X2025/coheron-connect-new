import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailBlock {
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'social' | 'spacer' | 'html';
  content: Record<string, any>;
  styles: Record<string, any>;
  order: number;
}

export interface IEmailTemplate extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  subject: string;
  category: string;
  blocks: IEmailBlock[];
  html_preview: string;
  thumbnail_url?: string;
  is_active: boolean;
  tags: string[];
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const emailBlockSchema = new Schema({
  type: { type: String, enum: ['header', 'text', 'image', 'button', 'divider', 'columns', 'social', 'spacer', 'html'], required: true },
  content: { type: Schema.Types.Mixed, default: {} },
  styles: { type: Schema.Types.Mixed, default: {} },
  order: { type: Number, required: true },
}, { _id: false });

const emailTemplateSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, default: 'general' },
  blocks: [emailBlockSchema],
  html_preview: { type: String, default: '' },
  thumbnail_url: { type: String },
  is_active: { type: Boolean, default: true },
  tags: [{ type: String }],
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

emailTemplateSchema.index({ tenant_id: 1, name: 1 });
emailTemplateSchema.index({ tenant_id: 1, category: 1 });
emailTemplateSchema.index({ tenant_id: 1, tags: 1 });

export const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ISupportMacro extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category?: string;
  actions: { type: string; value: any }[];
  visibility: string;
  owner_id: mongoose.Types.ObjectId;
  usage_count: number;
  last_used_at?: Date;
  keyboard_shortcut?: string;
}

const macroActionSchema = new Schema({
  type: { type: String, required: true, enum: ['set_status', 'set_priority', 'set_assignee', 'add_tags', 'remove_tags', 'set_type', 'add_comment', 'add_internal_note', 'send_email', 'set_custom_field'] },
  value: { type: Schema.Types.Mixed },
}, { _id: false });

const supportMacroSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  actions: [macroActionSchema],
  visibility: { type: String, enum: ['personal', 'team', 'global'], default: 'personal' },
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  usage_count: { type: Number, default: 0 },
  last_used_at: { type: Date },
  keyboard_shortcut: { type: String },
}, defaultSchemaOptions);

supportMacroSchema.index({ tenant_id: 1, visibility: 1 });
supportMacroSchema.index({ tenant_id: 1, category: 1 });
supportMacroSchema.index({ tenant_id: 1, usage_count: -1 });

export const SupportMacro = mongoose.model<ISupportMacro>('SupportMacro', supportMacroSchema);
export default SupportMacro;

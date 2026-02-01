import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const customViewSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  entity_type: { type: String, required: true },
  view_type: { type: String, required: true, enum: ['list', 'kanban', 'calendar', 'chart', 'form'] },
  config: { type: Schema.Types.Mixed, default: {} },
  is_default: { type: Boolean, default: false },
  is_shared: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId }
}, schemaOptions);

customViewSchema.index({ tenant_id: 1, entity_type: 1, view_type: 1 });

export const CustomView = mongoose.model('CustomView', customViewSchema);

import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

// ============================================
// Custom Field Definition
// ============================================
const customFieldSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  module: { type: String, required: true },
  entity: { type: String, required: true },
  field_name: { type: String, required: true },
  field_label: { type: String, required: true },
  field_type: {
    type: String,
    enum: ['text', 'number', 'date', 'datetime', 'boolean', 'select', 'multi_select', 'email', 'url', 'phone', 'textarea', 'currency', 'percent', 'lookup'],
    required: true,
  },
  options: [{ label: { type: String }, value: { type: String } }],
  default_value: { type: Schema.Types.Mixed },
  is_required: { type: Boolean, default: false },
  is_unique: { type: Boolean, default: false },
  is_searchable: { type: Boolean, default: false },
  is_filterable: { type: Boolean, default: false },
  validation: {
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String },
    error_message: { type: String },
  },
  display_order: { type: Number, default: 0 },
  section: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

customFieldSchema.index({ tenant_id: 1, module: 1, entity: 1 });
customFieldSchema.index({ tenant_id: 1, field_name: 1, entity: 1 }, { unique: true });

// ============================================
// Custom Field Value
// ============================================
const customFieldValueSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  field_id: { type: Schema.Types.ObjectId, ref: 'CustomField', required: true },
  entity_id: { type: Schema.Types.ObjectId, required: true },
  entity_type: { type: String, required: true },
  value: { type: Schema.Types.Mixed },
}, schemaOptions);

customFieldValueSchema.index({ entity_id: 1, entity_type: 1 });
customFieldValueSchema.index({ field_id: 1, entity_id: 1 }, { unique: true });
customFieldValueSchema.index({ tenant_id: 1, entity_type: 1, field_id: 1 });

export const CustomField = mongoose.model('CustomField', customFieldSchema);
export const CustomFieldValue = mongoose.model('CustomFieldValue', customFieldValueSchema);

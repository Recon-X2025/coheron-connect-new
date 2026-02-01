import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const fieldDefinitionSchema = new Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  field_type: {
    type: String,
    required: true,
    enum: ['text', 'number', 'decimal', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'relation', 'email', 'phone', 'url', 'textarea', 'rich_text', 'file', 'image', 'color', 'json']
  },
  required: { type: Boolean, default: false },
  default_value: { type: Schema.Types.Mixed },
  options: [{ type: String }],
  relation_entity: { type: String },
  relation_display_field: { type: String },
  validation_regex: { type: String },
  min_value: { type: Number },
  max_value: { type: Number },
  min_length: { type: Number },
  max_length: { type: Number },
  is_searchable: { type: Boolean, default: false },
  is_sortable: { type: Boolean, default: true },
  show_in_list: { type: Boolean, default: true },
  show_in_form: { type: Boolean, default: true },
  display_order: { type: Number, default: 0 }
}, { _id: false });

const customEntitySchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  display_name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  fields: [fieldDefinitionSchema],
  list_view_fields: [{ type: String }],
  default_sort_field: { type: String },
  default_sort_order: { type: String, enum: ['asc', 'desc'], default: 'desc' },
  enable_audit: { type: Boolean, default: false },
  enable_comments: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId }
}, schemaOptions);

customEntitySchema.index({ tenant_id: 1, slug: 1 }, { unique: true });

export const CustomEntity = mongoose.model('CustomEntity', customEntitySchema);

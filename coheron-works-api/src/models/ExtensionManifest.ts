import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const extensionManifestSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  version: { type: String, default: '1.0.0' },
  description: { type: String },
  author: { type: String },
  category: { type: String, enum: ['accounting', 'sales', 'inventory', 'hr', 'crm', 'marketing', 'support', 'utility'] },
  icon_url: { type: String },
  homepage_url: { type: String },
  models: [{ type: String }],
  routes: [{
    path: { type: String },
    method: { type: String },
    handler_code: { type: String }
  }],
  hooks: [{
    event: { type: String },
    entity_type: { type: String },
    handler_code: { type: String }
  }],
  settings_schema: { type: Schema.Types.Mixed, default: {} },
  settings_values: { type: Schema.Types.Mixed, default: {} },
  is_installed: { type: Boolean, default: false },
  installed_at: { type: Date },
  is_active: { type: Boolean, default: false }
}, schemaOptions);

extensionManifestSchema.index({ tenant_id: 1, slug: 1 }, { unique: true });
extensionManifestSchema.index({ tenant_id: 1, category: 1 });

export const ExtensionManifest = mongoose.model('ExtensionManifest', extensionManifestSchema);

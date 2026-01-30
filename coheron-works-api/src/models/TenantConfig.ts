import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantConfig extends Document {
  tenant_id: mongoose.Types.ObjectId;
  enabled_modules: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const tenantConfigSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, unique: true },
  enabled_modules: [{ type: String }],
  is_active: { type: Boolean, default: true },
}, schemaOptions);

tenantConfigSchema.index({ tenant_id: 1 }, { unique: true });

export const TenantConfig = mongoose.model<ITenantConfig>('TenantConfig', tenantConfigSchema);

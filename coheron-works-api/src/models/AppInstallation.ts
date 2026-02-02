import mongoose, { Schema, Document } from 'mongoose';

export interface IAppInstallation extends Document {
  tenant_id: mongoose.Types.ObjectId;
  app_id: mongoose.Types.ObjectId;
  config: Record<string, any>;
  installed_by: mongoose.Types.ObjectId;
  is_active: boolean;
  version_installed: string;
  installed_at: Date;
}

const schema = new Schema<IAppInstallation>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  app_id: { type: Schema.Types.ObjectId, ref: 'MarketplaceApp', required: true },
  config: { type: Schema.Types.Mixed, default: {} },
  installed_by: { type: Schema.Types.ObjectId },
  is_active: { type: Boolean, default: true },
  version_installed: { type: String, default: '1.0.0' },
  installed_at: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ tenant_id: 1, app_id: 1 }, { unique: true });

export default mongoose.model<IAppInstallation>('AppInstallation', schema);

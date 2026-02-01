import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IAppInstallation extends Document {
  tenant_id: mongoose.Types.ObjectId;
  app_id: mongoose.Types.ObjectId;
  installed_by: mongoose.Types.ObjectId;
  status: string;
  config: any;
  installed_at: Date;
  uninstalled_at?: Date;
  version_installed: string;
}

const appInstallationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  app_id: { type: Schema.Types.ObjectId, ref: 'MarketplaceApp', required: true },
  installed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'inactive', 'uninstalled'], default: 'active' },
  config: { type: Schema.Types.Mixed, default: {} },
  installed_at: { type: Date, default: Date.now },
  uninstalled_at: { type: Date },
  version_installed: { type: String, default: '1.0.0' },
}, defaultSchemaOptions);

appInstallationSchema.index({ tenant_id: 1, app_id: 1 }, { unique: true });
appInstallationSchema.index({ tenant_id: 1, status: 1 });

export const AppInstallation = mongoose.model<IAppInstallation>('AppInstallation', appInstallationSchema);
export default AppInstallation;

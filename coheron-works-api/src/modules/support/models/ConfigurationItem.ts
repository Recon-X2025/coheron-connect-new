import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IConfigurationItem extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  ci_type: string;
  status: string;
  environment: string;
  owner_id?: mongoose.Types.ObjectId;
  department: string;
  location: string;
  ip_address: string;
  serial_number: string;
  manufacturer: string;
  model_name: string;
  purchase_date?: Date;
  warranty_expiry?: Date;
  attributes: any;
  tags: string[];
  criticality: string;
}

const configurationItemSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  ci_type: { type: String, enum: ['server', 'network', 'application', 'database', 'storage', 'workstation', 'mobile', 'cloud_service', 'other'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance', 'retired', 'planned'], default: 'active' },
  environment: { type: String, enum: ['production', 'staging', 'development', 'testing'], default: 'production' },
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  department: { type: String, default: '' },
  location: { type: String, default: '' },
  ip_address: { type: String, default: '' },
  serial_number: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  model_name: { type: String, default: '' },
  purchase_date: { type: Date },
  warranty_expiry: { type: Date },
  attributes: { type: Schema.Types.Mixed, default: {} },
  tags: [{ type: String }],
  criticality: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
}, defaultSchemaOptions);

configurationItemSchema.index({ tenant_id: 1, ci_type: 1 });
configurationItemSchema.index({ tenant_id: 1, status: 1 });
configurationItemSchema.index({ tenant_id: 1, warranty_expiry: 1 });
configurationItemSchema.index({ name: 'text' });

export const ConfigurationItem = mongoose.model<IConfigurationItem>('ConfigurationItem', configurationItemSchema);
export default ConfigurationItem;

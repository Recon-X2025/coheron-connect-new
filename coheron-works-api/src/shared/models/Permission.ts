import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IPermission extends Document {
  code: string;
  name: string;
  description: string;
  module: string;
  feature: string;
  action: string;
  resource: string;
  resource_type: string;
  field_restrictions: any;
  record_access_level: string;
  conditions: any;
}

const permissionSchema = new Schema<IPermission>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  module: { type: String },
  feature: { type: String },
  action: { type: String },
  resource: { type: String },
  resource_type: { type: String },
  field_restrictions: { type: Schema.Types.Mixed, default: {} },
  record_access_level: { type: String, default: 'own' },
  conditions: { type: Schema.Types.Mixed, default: {} },
}, defaultSchemaOptions);

// Indexes
permissionSchema.index({ module: 1 });
permissionSchema.index({ resource: 1 });
permissionSchema.index({ action: 1 });
permissionSchema.index({ module: 1, resource: 1, action: 1 });

const PermissionModel = mongoose.model<IPermission>('Permission', permissionSchema);
export { PermissionModel as Permission };
export default PermissionModel;

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IRolePermission extends Document {
  role_id: mongoose.Types.ObjectId;
  permission_id: mongoose.Types.ObjectId;
  granted: boolean;
  conditions: any;
}

const rolePermissionSchema = new Schema<IRolePermission>({
  role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  permission_id: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
  granted: { type: Boolean, default: true },
  conditions: { type: Schema.Types.Mixed, default: {} },
}, defaultSchemaOptions);

rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });
rolePermissionSchema.index({ permission_id: 1 });
rolePermissionSchema.index({ granted: 1 });

const RolePermissionModel = mongoose.model<IRolePermission>('RolePermission', rolePermissionSchema);
export { RolePermissionModel as RolePermission };
export default RolePermissionModel;

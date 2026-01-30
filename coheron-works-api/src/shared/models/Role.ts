import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IRole extends Document {
  name: string;
  code: string;
  description: string;
  module: string;
  level: number;
  parent_role_id: mongoose.Types.ObjectId | null;
  is_system_role: boolean;
  is_active: boolean;
  priority: number;
  permissions: string[];
}

const roleSchema = new Schema<IRole>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  module: { type: String },
  level: { type: Number, default: 0 },
  parent_role_id: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
  is_system_role: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  permissions: [{ type: String }],
}, defaultSchemaOptions);

// Indexes
roleSchema.index({ module: 1 });
roleSchema.index({ is_active: 1 });
roleSchema.index({ parent_role_id: 1 });
roleSchema.index({ module: 1, is_active: 1 });

const RoleModel = mongoose.model<IRole>('Role', roleSchema);
export { RoleModel as Role };
export default RoleModel;

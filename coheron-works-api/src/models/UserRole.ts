import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IUserRole extends Document {
  user_id: mongoose.Types.ObjectId;
  role_id: mongoose.Types.ObjectId;
  is_active: boolean;
  assigned_by: mongoose.Types.ObjectId;
  assigned_at: Date;
  expires_at: Date;
  notes: string;
}

const userRoleSchema = new Schema<IUserRole>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  is_active: { type: Boolean, default: true },
  assigned_by: { type: Schema.Types.ObjectId, ref: 'User' },
  assigned_at: { type: Date, default: Date.now },
  expires_at: { type: Date },
  notes: { type: String },
}, defaultSchemaOptions);

userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });
userRoleSchema.index({ role_id: 1 });
userRoleSchema.index({ is_active: 1 });
userRoleSchema.index({ assigned_by: 1 });
userRoleSchema.index({ expires_at: 1 });

const UserRoleModel = mongoose.model<IUserRole>('UserRole', userRoleSchema);
export { UserRoleModel as UserRole };
export default UserRoleModel;

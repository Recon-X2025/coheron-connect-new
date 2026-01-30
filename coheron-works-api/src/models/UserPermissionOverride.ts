import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IUserPermissionOverride extends Document {
  user_id: mongoose.Types.ObjectId;
  permission_id: mongoose.Types.ObjectId;
  granted: boolean;
  expires_at: Date;
}

const userPermissionOverrideSchema = new Schema<IUserPermissionOverride>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  permission_id: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
  granted: { type: Boolean, default: true },
  expires_at: { type: Date },
}, defaultSchemaOptions);

userPermissionOverrideSchema.index({ user_id: 1, permission_id: 1 }, { unique: true });
userPermissionOverrideSchema.index({ permission_id: 1 });
userPermissionOverrideSchema.index({ expires_at: 1 });

export default mongoose.model<IUserPermissionOverride>('UserPermissionOverride', userPermissionOverrideSchema);

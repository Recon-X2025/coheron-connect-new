import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IRbacAuditLog extends Document {
  user_id: mongoose.Types.ObjectId;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value: any;
  new_value: any;
  ip_address: string;
  user_agent: string;
}

const rbacAuditLogSchema = new Schema<IRbacAuditLog>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String },
  resource_type: { type: String },
  resource_id: { type: String },
  old_value: { type: Schema.Types.Mixed },
  new_value: { type: Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
}, defaultSchemaOptions);

// Indexes
rbacAuditLogSchema.index({ user_id: 1 });
rbacAuditLogSchema.index({ action: 1 });
rbacAuditLogSchema.index({ resource_type: 1, resource_id: 1 });
rbacAuditLogSchema.index({ created_at: -1 });
rbacAuditLogSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model<IRbacAuditLog>('RbacAuditLog', rbacAuditLogSchema);

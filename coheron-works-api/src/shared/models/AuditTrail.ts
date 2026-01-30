import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IAuditTrail extends Document {
  tenant_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  metadata: any;
  ip_address: string;
  user_agent: string;
  request_id: string;
  timestamp: Date;
}

const auditTrailSchema = new Schema<IAuditTrail>({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'export', 'import', 'login', 'logout', 'permission_change', 'config_change'],
    required: true,
    index: true,
  },
  entity_type: { type: String, required: true, index: true },
  entity_id: { type: String },
  changes: [{
    field: { type: String },
    old_value: { type: Schema.Types.Mixed },
    new_value: { type: Schema.Types.Mixed },
  }],
  metadata: { type: Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
  request_id: { type: String, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
}, defaultSchemaOptions);

// Compound indexes
auditTrailSchema.index({ tenant_id: 1, entity_type: 1, entity_id: 1 });
auditTrailSchema.index({ tenant_id: 1, user_id: 1, timestamp: -1 });

export const AuditTrail = mongoose.model<IAuditTrail>('AuditTrail', auditTrailSchema);
export default AuditTrail;

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IChangeRecord extends Document {
  tenant_id: mongoose.Types.ObjectId;
  type: 'config_change' | 'permission_change' | 'schema_migration' | 'role_change' | 'module_toggle' | 'security_setting';
  description: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  requested_by: mongoose.Types.ObjectId;
  approved_by?: mongoose.Types.ObjectId;
  implemented_by?: mongoose.Types.ObjectId;
  rollback_plan?: string;
  status: 'pending' | 'approved' | 'implemented' | 'rolled_back';
  created_at: Date;
}

const changeRecordSchema = new Schema<IChangeRecord>({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  type: {
    type: String,
    required: true,
    index: true,
    enum: ['config_change', 'permission_change', 'schema_migration', 'role_change', 'module_toggle', 'security_setting'],
  },
  description: { type: String, required: true },
  entity_type: { type: String },
  entity_id: { type: String },
  old_value: { type: Schema.Types.Mixed },
  new_value: { type: Schema.Types.Mixed },
  requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  implemented_by: { type: Schema.Types.ObjectId, ref: 'User' },
  rollback_plan: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'implemented', 'rolled_back'],
    default: 'implemented',
  },
  created_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

changeRecordSchema.index({ tenant_id: 1, type: 1, created_at: -1 });

export const ChangeRecord = mongoose.model<IChangeRecord>('ChangeRecord', changeRecordSchema);
export default ChangeRecord;

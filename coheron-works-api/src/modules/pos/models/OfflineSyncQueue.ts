import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IOfflineSyncQueue extends Document {
  tenant_id: string;
  store_id: string;
  terminal_id: string;
  operation_type: string;
  payload: any;
  status: string;
  created_offline_at: Date;
  synced_at: Date;
  conflict_resolution: string;
  retry_count: number;
}

const OfflineSyncQueueSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  store_id: { type: String, required: true, index: true },
  terminal_id: { type: String, required: true, index: true },
  operation_type: { type: String, required: true, enum: ['sale', 'refund', 'void', 'customer_update', 'inventory_adjustment'] },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'syncing', 'synced', 'conflict', 'failed'] },
  created_offline_at: { type: Date, required: true },
  synced_at: { type: Date },
  conflict_resolution: { type: String },
  retry_count: { type: Number, default: 0 },
}, defaultSchemaOptions);

OfflineSyncQueueSchema.index({ tenant_id: 1, terminal_id: 1, status: 1 });

export const OfflineSyncQueue = mongoose.model<IOfflineSyncQueue>('OfflineSyncQueue', OfflineSyncQueueSchema);
export default OfflineSyncQueue;

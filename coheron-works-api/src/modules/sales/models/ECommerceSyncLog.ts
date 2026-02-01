import mongoose, { Schema } from 'mongoose';

export interface IECommerceSyncLog {
  tenant_id: mongoose.Types.ObjectId;
  channel_id: mongoose.Types.ObjectId;
  sync_type: 'products' | 'orders' | 'inventory' | 'full';
  status: 'running' | 'completed' | 'failed';
  records_synced: number;
  records_failed: number;
  errors: string[];
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const eCommerceSyncLogSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  channel_id: { type: Schema.Types.ObjectId, ref: 'ECommerceChannel', required: true, index: true },
  sync_type: { type: String, enum: ['products', 'orders', 'inventory', 'full'], required: true },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  records_synced: { type: Number, default: 0 },
  records_failed: { type: Number, default: 0 },
  errors: [{ type: String }],
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

eCommerceSyncLogSchema.index({ tenant_id: 1, channel_id: 1, started_at: -1 });

export const ECommerceSyncLog = mongoose.model<IECommerceSyncLog>('ECommerceSyncLog', eCommerceSyncLogSchema);

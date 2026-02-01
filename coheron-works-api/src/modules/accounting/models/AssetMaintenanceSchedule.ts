import mongoose, { Schema, Document } from 'mongoose';

export interface IAssetMaintenanceSchedule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  asset_id: mongoose.Types.ObjectId;
  asset_name: string;
  maintenance_type: 'preventive' | 'calibration' | 'inspection' | 'certification';
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  last_maintenance_date?: Date;
  next_maintenance_date: Date;
  estimated_cost: number;
  vendor_id?: mongoose.Types.ObjectId;
  description: string;
  status: 'active' | 'paused' | 'completed';
  maintenance_history: { date: Date; cost: number; performed_by: string; notes: string }[];
  created_at: Date;
  updated_at: Date;
}

const assetMaintenanceScheduleSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  asset_id: { type: Schema.Types.ObjectId, ref: 'FixedAsset', required: true },
  asset_name: { type: String, required: true },
  maintenance_type: { type: String, enum: ['preventive', 'calibration', 'inspection', 'certification'], default: 'preventive' },
  frequency: { type: String, enum: ['monthly', 'quarterly', 'semi_annual', 'annual'], required: true },
  last_maintenance_date: Date,
  next_maintenance_date: { type: Date, required: true },
  estimated_cost: { type: Number, default: 0 },
  vendor_id: { type: Schema.Types.ObjectId },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  maintenance_history: [{ date: Date, cost: Number, performed_by: String, notes: String }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

assetMaintenanceScheduleSchema.index({ tenant_id: 1, asset_id: 1 });
assetMaintenanceScheduleSchema.index({ tenant_id: 1, next_maintenance_date: 1 });

export const AssetMaintenanceSchedule = mongoose.model<IAssetMaintenanceSchedule>('AssetMaintenanceSchedule', assetMaintenanceScheduleSchema);

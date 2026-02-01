import mongoose, { Schema, Document } from 'mongoose';

export interface IBiometricDevice extends Document {
  tenant_id: mongoose.Types.ObjectId;
  device_name: string;
  device_type: 'fingerprint' | 'face' | 'iris' | 'card' | 'multi';
  ip_address: string;
  port: number;
  serial_number: string;
  location: string;
  status: 'active' | 'inactive' | 'offline' | 'maintenance';
  protocol: 'zkteco' | 'hikvision' | 'suprema' | 'generic_api';
  last_sync_at?: Date;
  sync_interval_minutes: number;
  auto_sync: boolean;
  created_at: Date;
  updated_at: Date;
}

const biometricDeviceSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  device_name: { type: String, required: true },
  device_type: { type: String, enum: ['fingerprint', 'face', 'iris', 'card', 'multi'], required: true },
  ip_address: { type: String, required: true },
  port: { type: Number, default: 4370 },
  serial_number: { type: String, required: true },
  location: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'offline', 'maintenance'], default: 'active' },
  protocol: { type: String, enum: ['zkteco', 'hikvision', 'suprema', 'generic_api'], default: 'zkteco' },
  last_sync_at: Date,
  sync_interval_minutes: { type: Number, default: 15 },
  auto_sync: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

biometricDeviceSchema.index({ tenant_id: 1, serial_number: 1 }, { unique: true });

export const BiometricDevice = mongoose.model<IBiometricDevice>('BiometricDevice', biometricDeviceSchema);

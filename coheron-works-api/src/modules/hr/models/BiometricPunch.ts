import mongoose, { Schema, Document } from 'mongoose';

export interface IBiometricPunch extends Document {
  tenant_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  device_id: mongoose.Types.ObjectId;
  punch_time: Date;
  punch_type: 'check_in' | 'check_out' | 'break_start' | 'break_end';
  verification_method: 'fingerprint' | 'face' | 'iris' | 'card' | 'pin';
  raw_data?: string;
  synced: boolean;
  attendance_linked: boolean;
  created_at: Date;
}

const biometricPunchSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  device_id: { type: Schema.Types.ObjectId, ref: 'BiometricDevice', required: true },
  punch_time: { type: Date, required: true },
  punch_type: { type: String, enum: ['check_in', 'check_out', 'break_start', 'break_end'], required: true },
  verification_method: { type: String, enum: ['fingerprint', 'face', 'iris', 'card', 'pin'], required: true },
  raw_data: String,
  synced: { type: Boolean, default: false },
  attendance_linked: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

biometricPunchSchema.index({ tenant_id: 1, employee_id: 1, punch_time: -1 });
biometricPunchSchema.index({ tenant_id: 1, device_id: 1, synced: 1 });

export const BiometricPunch = mongoose.model<IBiometricPunch>('BiometricPunch', biometricPunchSchema);

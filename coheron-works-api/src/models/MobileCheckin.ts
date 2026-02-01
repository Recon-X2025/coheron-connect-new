import mongoose, { Schema, Document } from 'mongoose';

export interface IMobileCheckin extends Document {
  tenant_id: string;
  employee_id: mongoose.Types.ObjectId;
  checkin_type: 'in' | 'out';
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  address?: string;
  device_info?: string;
  photo_url?: string;
  is_within_geofence: boolean;
  geofence_id?: mongoose.Types.ObjectId;
  notes?: string;
  created_at: Date;
}

const MobileCheckinSchema = new Schema<IMobileCheckin>(
  {
    tenant_id: { type: String, required: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    checkin_type: { type: String, enum: ['in', 'out'], required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy_meters: { type: Number, default: 0 },
    address: { type: String },
    device_info: { type: String },
    photo_url: { type: String },
    is_within_geofence: { type: Boolean, default: false },
    geofence_id: { type: Schema.Types.ObjectId, ref: 'Geofence' },
    notes: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

MobileCheckinSchema.index({ tenant_id: 1, employee_id: 1, timestamp: 1 });
MobileCheckinSchema.index({ tenant_id: 1, timestamp: 1 });

export default mongoose.model<IMobileCheckin>('MobileCheckin', MobileCheckinSchema);

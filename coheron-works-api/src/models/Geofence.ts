import mongoose, { Schema, Document } from 'mongoose';

export interface IGeofence extends Document {
  tenant_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const GeofenceSchema = new Schema<IGeofence>(
  {
    tenant_id: { type: String, required: true },
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius_meters: { type: Number, required: true, default: 100 },
    address: { type: String },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

GeofenceSchema.index({ tenant_id: 1, is_active: 1 });

export default mongoose.model<IGeofence>('Geofence', GeofenceSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IRFIDReader extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  reader_id: string;
  location_description: string;
  warehouse_id: mongoose.Types.ObjectId;
  zone_id: mongoose.Types.ObjectId;
  reader_type: string;
  ip_address: string;
  port: number;
  protocol: string;
  is_active: boolean;
  last_heartbeat: Date;
  antenna_count: number;
  read_power_dbm: number;
  created_at: Date;
  updated_at: Date;
}

const rfidReaderSchema = new Schema<IRFIDReader>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  reader_id: { type: String, required: true },
  location_description: { type: String },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  zone_id: { type: Schema.Types.ObjectId },
  reader_type: { type: String, enum: ['fixed', 'handheld', 'portal'], default: 'fixed' },
  ip_address: { type: String },
  port: { type: Number },
  protocol: { type: String, enum: ['llrp', 'mqtt', 'http'], default: 'llrp' },
  is_active: { type: Boolean, default: true },
  last_heartbeat: { type: Date },
  antenna_count: { type: Number, default: 1 },
  read_power_dbm: { type: Number, default: 30 },
}, defaultSchemaOptions);

rfidReaderSchema.index({ tenant_id: 1, reader_id: 1 }, { unique: true });

export const RFIDReader = mongoose.model<IRFIDReader>('RFIDReader', rfidReaderSchema);
export default RFIDReader;

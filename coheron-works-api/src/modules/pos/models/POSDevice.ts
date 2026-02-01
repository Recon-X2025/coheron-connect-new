import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IPOSDevice extends Document {
  tenant_id: string;
  store_id: string;
  name: string;
  device_type: string;
  connection_type: string;
  ip_address: string;
  port: number;
  driver: string;
  status: string;
  config: any;
  last_seen_at: Date;
  firmware_version: string;
}

const POSDeviceSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  store_id: { type: String, index: true },
  name: { type: String, required: true },
  device_type: { type: String, required: true, enum: ['terminal', 'receipt_printer', 'barcode_scanner', 'cash_drawer', 'card_reader', 'scale', 'customer_display', 'label_printer'] },
  connection_type: { type: String, required: true, enum: ['usb', 'bluetooth', 'network', 'serial'] },
  ip_address: { type: String },
  port: { type: Number },
  driver: { type: String, enum: ['epson', 'star', 'zebra', 'generic', 'browser'] },
  status: { type: String, default: 'offline', enum: ['online', 'offline', 'error'] },
  config: { type: Schema.Types.Mixed, default: {} },
  last_seen_at: { type: Date },
  firmware_version: { type: String },
}, defaultSchemaOptions);

POSDeviceSchema.index({ tenant_id: 1, store_id: 1 });

export const POSDevice = mongoose.model<IPOSDevice>('POSDevice', POSDeviceSchema);
export default POSDevice;

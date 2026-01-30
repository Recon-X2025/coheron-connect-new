import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IWarehouse extends Document {
  code: string;
  name: string;
  warehouse_type: string;
  partner_id: mongoose.Types.ObjectId;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  phone: string;
  email: string;
  manager_id: mongoose.Types.ObjectId;
  active: boolean;
  temperature_controlled: boolean;
  humidity_controlled: boolean;
  security_level: string;
  operating_hours: string;
  capacity_cubic_meters: number;
  notes: string;
}

const warehouseSchema = new Schema<IWarehouse>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  warehouse_type: { type: String, default: 'internal' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  zip_code: { type: String },
  phone: { type: String },
  email: { type: String },
  manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  active: { type: Boolean, default: true },
  temperature_controlled: { type: Boolean, default: false },
  humidity_controlled: { type: Boolean, default: false },
  security_level: { type: String },
  operating_hours: { type: String },
  capacity_cubic_meters: { type: Number },
  notes: { type: String },
}, defaultSchemaOptions);

warehouseSchema.index({ code: 1 }, { unique: true });
warehouseSchema.index({ name: 1 });
warehouseSchema.index({ partner_id: 1 });
warehouseSchema.index({ manager_id: 1 });
warehouseSchema.index({ warehouse_type: 1 });
warehouseSchema.index({ active: 1 });

export default mongoose.model<IWarehouse>('Warehouse', warehouseSchema);

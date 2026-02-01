import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ISerialNumber extends Document {
  tenant_id: string;
  serial_number: string;
  product_id: mongoose.Types.ObjectId;
  batch_id?: mongoose.Types.ObjectId;
  status: 'available' | 'reserved' | 'sold' | 'returned' | 'scrapped';
  warehouse_id?: mongoose.Types.ObjectId;
  location_bin?: string;
  purchase_order_id?: mongoose.Types.ObjectId;
  sale_order_id?: mongoose.Types.ObjectId;
  warranty_start?: Date;
  warranty_end?: Date;
  manufacture_date?: Date;
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const serialNumberSchema = new Schema<ISerialNumber>({
  tenant_id: { type: String, required: true },
  serial_number: { type: String, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  batch_id: { type: Schema.Types.ObjectId, ref: 'Batch' },
  status: { type: String, enum: ['available', 'reserved', 'sold', 'returned', 'scrapped'], default: 'available' },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  location_bin: { type: String },
  purchase_order_id: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  warranty_start: { type: Date },
  warranty_end: { type: Date },
  manufacture_date: { type: Date },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

serialNumberSchema.index({ tenant_id: 1, serial_number: 1 }, { unique: true });
serialNumberSchema.index({ tenant_id: 1, product_id: 1, status: 1 });
serialNumberSchema.index({ tenant_id: 1, batch_id: 1 });

export default mongoose.model<ISerialNumber>('SerialNumber', serialNumberSchema);

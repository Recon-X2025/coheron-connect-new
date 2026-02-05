import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IBatch extends Document {
  tenant_id: string;
  batch_number: string;
  product_id: mongoose.Types.ObjectId;
  manufacture_date?: Date;
  expiry_date?: Date;
  supplier_batch_ref?: string;
  quantity_produced: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_sold: number;
  status: 'active' | 'expired' | 'recalled' | 'depleted';
  warehouse_id?: mongoose.Types.ObjectId;
  quality_status: 'pending' | 'passed' | 'failed';
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const batchSchema = new Schema<IBatch>({
  tenant_id: { type: String, required: true },
  batch_number: { type: String, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  manufacture_date: { type: Date },
  expiry_date: { type: Date },
  supplier_batch_ref: { type: String },
  quantity_produced: { type: Number, default: 0 },
  quantity_available: { type: Number, default: 0 },
  quantity_reserved: { type: Number, default: 0 },
  quantity_sold: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'expired', 'recalled', 'depleted'], default: 'active' },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  quality_status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

batchSchema.index({ tenant_id: 1, batch_number: 1 }, { unique: true });
batchSchema.index({ tenant_id: 1, product_id: 1 });
batchSchema.index({ tenant_id: 1, expiry_date: 1 });

export default mongoose.models.Batch as mongoose.Model<IBatch> || mongoose.model<IBatch>('Batch', batchSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ICycleCountItem {
  product_id: mongoose.Types.ObjectId;
  bin_location_id?: mongoose.Types.ObjectId;
  system_quantity: number;
  counted_quantity?: number;
  variance?: number;
  variance_pct?: number;
  serial_numbers_found?: string[];
  batch_id?: mongoose.Types.ObjectId;
  notes?: string;
  counted_by?: mongoose.Types.ObjectId;
  counted_at?: Date;
}

export interface ICycleCount extends Document {
  tenant_id: string;
  count_number: string;
  warehouse_id: mongoose.Types.ObjectId;
  zone_id?: mongoose.Types.ObjectId;
  count_type: 'full' | 'zone' | 'abc_class' | 'random_sample';
  abc_class?: 'A' | 'B' | 'C';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: Date;
  started_at?: Date;
  completed_at?: Date;
  counted_by: mongoose.Types.ObjectId[];
  items: ICycleCountItem[];
  total_items: number;
  items_counted: number;
  items_with_variance: number;
  variance_value: number;
  adjustment_journal_id?: mongoose.Types.ObjectId;
  notes?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const cycleCountSchema = new Schema<ICycleCount>({
  tenant_id: { type: String, required: true },
  count_number: { type: String, required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  zone_id: { type: Schema.Types.ObjectId, ref: 'WarehouseZone' },
  count_type: { type: String, enum: ['full', 'zone', 'abc_class', 'random_sample'], required: true },
  abc_class: { type: String, enum: ['A', 'B', 'C'] },
  status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' },
  scheduled_date: { type: Date, required: true },
  started_at: { type: Date },
  completed_at: { type: Date },
  counted_by: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  items: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    bin_location_id: { type: Schema.Types.ObjectId, ref: 'BinLocation' },
    system_quantity: { type: Number, required: true },
    counted_quantity: { type: Number },
    variance: { type: Number },
    variance_pct: { type: Number },
    serial_numbers_found: [{ type: String }],
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch' },
    notes: { type: String },
    counted_by: { type: Schema.Types.ObjectId, ref: 'Employee' },
    counted_at: { type: Date },
  }],
  total_items: { type: Number, default: 0 },
  items_counted: { type: Number, default: 0 },
  items_with_variance: { type: Number, default: 0 },
  variance_value: { type: Number, default: 0 },
  adjustment_journal_id: { type: Schema.Types.ObjectId, ref: 'AccountMove' },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

cycleCountSchema.index({ tenant_id: 1, count_number: 1 }, { unique: true });
cycleCountSchema.index({ tenant_id: 1, warehouse_id: 1, scheduled_date: 1 });
cycleCountSchema.index({ tenant_id: 1, status: 1 });

export const CycleCount = mongoose.model<ICycleCount>('CycleCount', cycleCountSchema);
export default CycleCount;

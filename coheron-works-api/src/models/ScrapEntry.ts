import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IScrapEntry extends Document {
  tenant_id: mongoose.Types.ObjectId;
  scrap_number: string;
  manufacturing_order_id?: mongoose.Types.ObjectId;
  work_center_id?: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  unit_of_measure?: string;
  scrap_reason: string;
  serial_numbers: string[];
  batch_id?: string;
  estimated_value: number;
  salvage_value: number;
  disposal_method: string;
  disposed_by?: mongoose.Types.ObjectId;
  disposed_at?: Date;
  warehouse_id?: mongoose.Types.ObjectId;
  bin_location?: string;
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const scrapEntrySchema = new Schema<IScrapEntry>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  scrap_number: { type: String, required: true },
  manufacturing_order_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
  work_center_id: { type: Schema.Types.ObjectId, ref: 'Workcenter' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unit_of_measure: { type: String },
  scrap_reason: {
    type: String,
    enum: ['defective', 'damaged', 'expired', 'wrong_material', 'machine_error', 'other'],
    default: 'other',
  },
  serial_numbers: [{ type: String }],
  batch_id: { type: String },
  estimated_value: { type: Number, default: 0 },
  salvage_value: { type: Number, default: 0 },
  disposal_method: {
    type: String,
    enum: ['recycle', 'dispose', 'rework', 'return_to_vendor'],
    default: 'dispose',
  },
  disposed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  disposed_at: { type: Date },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  bin_location: { type: String },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

scrapEntrySchema.index({ tenant_id: 1, scrap_number: 1 }, { unique: true });
scrapEntrySchema.index({ tenant_id: 1, manufacturing_order_id: 1 });
scrapEntrySchema.index({ tenant_id: 1, product_id: 1 });

export default mongoose.models.ScrapEntry as mongoose.Model<IScrapEntry> || mongoose.model<IScrapEntry>('ScrapEntry', scrapEntrySchema);

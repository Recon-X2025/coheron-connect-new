import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ISubcontractMaterial {
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  serial_numbers?: string[];
  batch_id?: string;
}

export interface ISubcontract extends Document {
  tenant_id: mongoose.Types.ObjectId;
  subcontract_number: string;
  vendor_id: mongoose.Types.ObjectId;
  manufacturing_order_id?: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  operation_name: string;
  materials_sent: ISubcontractMaterial[];
  expected_quantity: number;
  received_quantity: number;
  unit_cost: number;
  total_cost: number;
  status: string;
  sent_date?: Date;
  expected_return_date?: Date;
  actual_return_date?: Date;
  quality_status?: string;
  warehouse_id?: mongoose.Types.ObjectId;
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const subcontractSchema = new Schema<ISubcontract>({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  subcontract_number: { type: String, required: true },
  vendor_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  manufacturing_order_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  operation_name: { type: String, required: true },
  materials_sent: [{
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 0 },
    serial_numbers: [{ type: String }],
    batch_id: { type: String },
  }],
  expected_quantity: { type: Number, default: 0 },
  received_quantity: { type: Number, default: 0 },
  unit_cost: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'materials_sent', 'in_progress', 'received', 'quality_check', 'completed', 'cancelled'],
    default: 'draft',
  },
  sent_date: { type: Date },
  expected_return_date: { type: Date },
  actual_return_date: { type: Date },
  quality_status: { type: String },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

subcontractSchema.index({ tenant_id: 1, subcontract_number: 1 }, { unique: true });
subcontractSchema.index({ tenant_id: 1, vendor_id: 1 });
subcontractSchema.index({ tenant_id: 1, status: 1 });

export default mongoose.models.Subcontract as mongoose.Model<ISubcontract> || mongoose.model<ISubcontract>('Subcontract', subcontractSchema);

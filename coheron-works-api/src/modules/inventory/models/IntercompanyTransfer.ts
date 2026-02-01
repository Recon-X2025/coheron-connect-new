import mongoose, { Schema, Document } from 'mongoose';

export interface IIntercompanyTransferLine {
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface IIntercompanyTransfer extends Document {
  tenant_id: mongoose.Types.ObjectId;
  transfer_number: string;
  source_entity: string;
  destination_entity: string;
  source_warehouse_id: mongoose.Types.ObjectId;
  destination_warehouse_id: mongoose.Types.ObjectId;
  lines: IIntercompanyTransferLine[];
  total_value: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  transfer_date: Date;
  expected_delivery: Date;
  actual_delivery: Date;
  notes: string;
  created_by: mongoose.Types.ObjectId;
  approved_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const transferLineSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unit_cost: { type: Number, required: true },
  total_cost: { type: Number, required: true },
}, { _id: false });

const intercompanyTransferSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  transfer_number: { type: String, required: true },
  source_entity: { type: String, required: true },
  destination_entity: { type: String, required: true },
  source_warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  destination_warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  lines: [transferLineSchema],
  total_value: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'in_transit', 'received', 'cancelled'], default: 'draft' },
  transfer_date: Date,
  expected_delivery: Date,
  actual_delivery: Date,
  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

intercompanyTransferSchema.index({ tenant_id: 1, transfer_number: 1 }, { unique: true });
intercompanyTransferSchema.index({ tenant_id: 1, status: 1 });

export const IntercompanyTransfer = mongoose.model<IIntercompanyTransfer>('IntercompanyTransfer', intercompanyTransferSchema);

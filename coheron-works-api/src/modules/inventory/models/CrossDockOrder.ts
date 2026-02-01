import mongoose, { Schema, Document } from 'mongoose';

export interface ICrossDockItem {
  product_id: mongoose.Types.ObjectId;
  inbound_po_id: mongoose.Types.ObjectId;
  outbound_order_id: mongoose.Types.ObjectId;
  quantity: number;
  received_quantity: number;
  shipped_quantity: number;
  status: 'awaiting_receipt' | 'received' | 'staged' | 'shipped';
}

export interface ICrossDockOrder extends Document {
  tenant_id: mongoose.Types.ObjectId;
  cross_dock_number: string;
  warehouse_id: mongoose.Types.ObjectId;
  dock_location: string;
  status: 'planned' | 'receiving' | 'staging' | 'shipping' | 'completed' | 'cancelled';
  items: ICrossDockItem[];
  expected_receipt_date: Date;
  expected_ship_date: Date;
  actual_receipt_date?: Date;
  actual_ship_date?: Date;
  notes?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const crossDockItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  inbound_po_id: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  outbound_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder', required: true },
  quantity: { type: Number, required: true },
  received_quantity: { type: Number, default: 0 },
  shipped_quantity: { type: Number, default: 0 },
  status: { type: String, enum: ['awaiting_receipt', 'received', 'staged', 'shipped'], default: 'awaiting_receipt' },
}, { _id: false });

const crossDockOrderSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  cross_dock_number: { type: String, required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  dock_location: { type: String, default: '' },
  status: { type: String, enum: ['planned', 'receiving', 'staging', 'shipping', 'completed', 'cancelled'], default: 'planned' },
  items: [crossDockItemSchema],
  expected_receipt_date: { type: Date, required: true },
  expected_ship_date: { type: Date, required: true },
  actual_receipt_date: Date,
  actual_ship_date: Date,
  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

crossDockOrderSchema.index({ tenant_id: 1, cross_dock_number: 1 }, { unique: true });

export const CrossDockOrder = mongoose.model<ICrossDockOrder>('CrossDockOrder', crossDockOrderSchema);

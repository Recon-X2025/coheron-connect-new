import mongoose, { Schema, Document } from 'mongoose';

export interface IPickListItem {
  product_id: mongoose.Types.ObjectId;
  variant_id?: mongoose.Types.ObjectId;
  order_id: mongoose.Types.ObjectId;
  location_bin: string;
  quantity_required: number;
  quantity_picked: number;
  serial_numbers?: string[];
  batch_number?: string;
  status: 'pending' | 'picked' | 'short' | 'skipped';
}

export interface IPickList extends Document {
  tenant_id: mongoose.Types.ObjectId;
  pick_list_number: string;
  wave_id?: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  assigned_to?: mongoose.Types.ObjectId;
  status: 'pending' | 'in_progress' | 'completed' | 'partial';
  items: IPickListItem[];
  pick_sequence: number[];
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const pickListItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_id: { type: Schema.Types.ObjectId },
  order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder', required: true },
  location_bin: { type: String, required: true },
  quantity_required: { type: Number, required: true },
  quantity_picked: { type: Number, default: 0 },
  serial_numbers: [String],
  batch_number: String,
  status: { type: String, enum: ['pending', 'picked', 'short', 'skipped'], default: 'pending' },
}, { _id: false });

const pickListSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  pick_list_number: { type: String, required: true },
  wave_id: { type: Schema.Types.ObjectId, ref: 'PickWave' },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'partial'], default: 'pending' },
  items: [pickListItemSchema],
  pick_sequence: [Number],
  started_at: Date,
  completed_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

pickListSchema.index({ tenant_id: 1, pick_list_number: 1 }, { unique: true });

export const PickList = mongoose.model<IPickList>('PickList', pickListSchema);

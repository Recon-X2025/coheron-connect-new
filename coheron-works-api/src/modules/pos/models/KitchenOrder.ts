import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IKitchenOrder extends Document {
  tenant_id: mongoose.Types.ObjectId;
  station_id: mongoose.Types.ObjectId;
  pos_order_id: mongoose.Types.ObjectId;
  order_number: string;
  items: {
    name: string;
    quantity: number;
    notes: string;
    status: 'pending' | 'preparing' | 'ready' | 'served';
    started_at: Date;
    completed_at: Date;
  }[];
  priority: 'normal' | 'rush' | 'vip';
  status: 'pending' | 'in_progress' | 'ready' | 'completed';
  received_at: Date;
  started_at: Date;
  completed_at: Date;
  avg_prep_time: number;
}

const kitchenOrderSchema = new Schema<IKitchenOrder>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  station_id: { type: Schema.Types.ObjectId, ref: 'KitchenStation', required: true },
  pos_order_id: { type: Schema.Types.ObjectId },
  order_number: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    notes: { type: String },
    status: { type: String, enum: ['pending', 'preparing', 'ready', 'served'], default: 'pending' },
    started_at: { type: Date },
    completed_at: { type: Date },
  }],
  priority: { type: String, enum: ['normal', 'rush', 'vip'], default: 'normal' },
  status: { type: String, enum: ['pending', 'in_progress', 'ready', 'completed'], default: 'pending' },
  received_at: { type: Date, default: Date.now },
  started_at: { type: Date },
  completed_at: { type: Date },
  avg_prep_time: { type: Number },
}, defaultSchemaOptions);

kitchenOrderSchema.index({ tenant_id: 1, station_id: 1, status: 1 });
kitchenOrderSchema.index({ tenant_id: 1, status: 1 });

export const KitchenOrder = mongoose.model<IKitchenOrder>('KitchenOrder', kitchenOrderSchema);

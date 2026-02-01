import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IATPRecord extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  date: Date;
  on_hand: number;
  allocated: number;
  incoming: number;
  available: number;
  next_available_date: Date;
  next_available_qty: number;
}

const atpRecordSchema = new Schema<IATPRecord>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  date: { type: Date, required: true },
  on_hand: { type: Number, default: 0 },
  allocated: { type: Number, default: 0 },
  incoming: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  next_available_date: { type: Date },
  next_available_qty: { type: Number, default: 0 },
}, defaultSchemaOptions);

atpRecordSchema.index({ tenant_id: 1, product_id: 1, warehouse_id: 1, date: 1 });
atpRecordSchema.index({ tenant_id: 1, product_id: 1, date: 1 });

export const ATPRecord = mongoose.model<IATPRecord>('ATPRecord', atpRecordSchema);

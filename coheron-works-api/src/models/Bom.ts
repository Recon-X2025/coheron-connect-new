import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IBom extends Document {
  name: string;
  code: string;
  product_id: mongoose.Types.ObjectId;
  product_qty: number;
  product_uom_id: mongoose.Types.ObjectId;
  type: string;
  active: boolean;
  version: number;
  date_start: Date;
  date_stop: Date;
  sequence: number;
  ready_to_produce: string;
  user_id: mongoose.Types.ObjectId;
  notes: string;
  // --- Enhanced fields ---
  is_phantom: boolean;
  consumption_type: string;
  scrap_percentage: number;
  total_cost: number;
  tenant_id: mongoose.Types.ObjectId;
}

const bomSchema = new Schema<IBom>({
  name: { type: String, required: true },
  code: { type: String },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_qty: { type: Number, default: 1 },
  product_uom_id: { type: Schema.Types.ObjectId },
  type: { type: String, default: 'normal' },
  active: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  date_start: { type: Date },
  date_stop: { type: Date },
  sequence: { type: Number, default: 10 },
  ready_to_produce: { type: String, default: 'asap' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  // --- Enhanced fields ---
  is_phantom: { type: Boolean, default: false },
  consumption_type: { type: String, enum: ['strict', 'flexible'], default: 'strict' },
  scrap_percentage: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  tenant_id: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

bomSchema.index({ product_id: 1 });
bomSchema.index({ name: 1 });
bomSchema.index({ user_id: 1 });
bomSchema.index({ active: 1 });
bomSchema.index({ type: 1 });
bomSchema.index({ product_id: 1, active: 1 });
bomSchema.index({ tenant_id: 1 });

export default mongoose.model<IBom>('Bom', bomSchema);

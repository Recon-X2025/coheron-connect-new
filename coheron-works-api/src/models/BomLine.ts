import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IBomLine extends Document {
  bom_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  product_qty: number;
  product_uom_id: mongoose.Types.ObjectId;
  sequence: number;
  operation_id: mongoose.Types.ObjectId;
  type: string;
  date_start: Date;
  date_stop: Date;
  notes: string;
  // --- Enhanced fields ---
  scrap_percent: number;
  optional: boolean;
  substitute_product_ids: mongoose.Types.ObjectId[];
}

const bomLineSchema = new Schema<IBomLine>({
  bom_id: { type: Schema.Types.ObjectId, ref: 'Bom', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  product_qty: { type: Number, required: true },
  product_uom_id: { type: Schema.Types.ObjectId },
  sequence: { type: Number, default: 10 },
  operation_id: { type: Schema.Types.ObjectId, ref: 'RoutingOperation' },
  type: { type: String, default: 'normal' },
  date_start: { type: Date },
  date_stop: { type: Date },
  notes: { type: String },
  // --- Enhanced fields ---
  scrap_percent: { type: Number, default: 0 },
  optional: { type: Boolean, default: false },
  substitute_product_ids: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
}, defaultSchemaOptions);

bomLineSchema.index({ bom_id: 1, sequence: 1 });
bomLineSchema.index({ product_id: 1 });
bomLineSchema.index({ operation_id: 1 });

export default mongoose.model<IBomLine>('BomLine', bomLineSchema);

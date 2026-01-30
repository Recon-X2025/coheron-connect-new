import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoFinishedGoods extends Document {
  mo_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  product_uom_qty: number;
  state: string;
  date_actual: Date;
}

const schema = new Schema<IMoFinishedGoods>({
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_uom_qty: { type: Number, default: 0 },
  state: { type: String, default: 'draft' },
  date_actual: { type: Date },
}, defaultSchemaOptions);

schema.index({ mo_id: 1 });
schema.index({ state: 1 });
schema.index({ product_id: 1 });
schema.index({ mo_id: 1, state: 1 });

export default mongoose.model<IMoFinishedGoods>('MoFinishedGoods', schema);

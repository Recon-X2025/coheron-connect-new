import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockQuant extends Document {
  product_id: mongoose.Types.ObjectId;
  location_id: mongoose.Types.ObjectId;
  lot_id: mongoose.Types.ObjectId;
  quantity: number;
  reserved_quantity: number;
}

const stockQuantSchema = new Schema<IStockQuant>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  location_id: { type: Schema.Types.ObjectId, ref: 'StockLocation', required: true },
  lot_id: { type: Schema.Types.ObjectId, ref: 'StockProductionLot' },
  quantity: { type: Number, default: 0 },
  reserved_quantity: { type: Number, default: 0 },
}, defaultSchemaOptions);

stockQuantSchema.index({ product_id: 1, location_id: 1 });
stockQuantSchema.index({ product_id: 1 });
stockQuantSchema.index({ location_id: 1 });
stockQuantSchema.index({ lot_id: 1 });

export default mongoose.model<IStockQuant>('StockQuant', stockQuantSchema);

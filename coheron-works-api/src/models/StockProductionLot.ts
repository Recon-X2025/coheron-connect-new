import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockProductionLot extends Document {
  name: string;
  product_id: mongoose.Types.ObjectId;
  ref: string;
  note: string;
}

const stockProductionLotSchema = new Schema<IStockProductionLot>({
  name: { type: String, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  ref: { type: String },
  note: { type: String },
}, defaultSchemaOptions);

stockProductionLotSchema.index({ name: 1, product_id: 1 }, { unique: true });
stockProductionLotSchema.index({ product_id: 1 });

export default mongoose.models.StockProductionLot as mongoose.Model<IStockProductionLot> || mongoose.model<IStockProductionLot>('StockProductionLot', stockProductionLotSchema);

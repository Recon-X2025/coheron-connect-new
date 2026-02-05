import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockSerial extends Document {
  name: string;
  product_id: mongoose.Types.ObjectId;
  lot_id: mongoose.Types.ObjectId;
  warranty_start_date: Date;
  warranty_end_date: Date;
  notes: string;
}

const stockSerialSchema = new Schema<IStockSerial>({
  name: { type: String, required: true, unique: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  lot_id: { type: Schema.Types.ObjectId, ref: 'StockProductionLot' },
  warranty_start_date: { type: Date },
  warranty_end_date: { type: Date },
  notes: { type: String },
}, defaultSchemaOptions);

stockSerialSchema.index({ name: 1 }, { unique: true });
stockSerialSchema.index({ product_id: 1 });
stockSerialSchema.index({ lot_id: 1 });

export default mongoose.models.StockSerial as mongoose.Model<IStockSerial> || mongoose.model<IStockSerial>('StockSerial', stockSerialSchema);

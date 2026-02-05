import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockLocation extends Document {
  name: string;
  complete_name: string;
  location_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  usage: string;
  active: boolean;
  scrap_location: boolean;
  return_location: boolean;
  posx: number;
  posy: number;
  posz: number;
  removal_strategy: string;
  barcode: string;
  notes: string;
}

const stockLocationSchema = new Schema<IStockLocation>({
  name: { type: String, required: true },
  complete_name: { type: String },
  location_id: { type: Schema.Types.ObjectId, ref: 'StockLocation' },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  usage: { type: String, default: 'internal' },
  active: { type: Boolean, default: true },
  scrap_location: { type: Boolean, default: false },
  return_location: { type: Boolean, default: false },
  posx: { type: Number },
  posy: { type: Number },
  posz: { type: Number },
  removal_strategy: { type: String, default: 'fifo' },
  barcode: { type: String },
  notes: { type: String },
}, defaultSchemaOptions);

stockLocationSchema.index({ warehouse_id: 1 });
stockLocationSchema.index({ name: 1 });
stockLocationSchema.index({ location_id: 1 });
stockLocationSchema.index({ usage: 1 });
stockLocationSchema.index({ active: 1 });
stockLocationSchema.index({ warehouse_id: 1, usage: 1 });

export default mongoose.models.StockLocation as mongoose.Model<IStockLocation> || mongoose.model<IStockLocation>('StockLocation', stockLocationSchema);

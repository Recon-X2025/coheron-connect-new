import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockLedger extends Document {
  product_id: mongoose.Types.ObjectId;
  location_id: mongoose.Types.ObjectId;
  transaction_type: string;
  transaction_date: Date;
  reference: string;
  quantity_in: number;
  quantity_out: number;
  balance: number;
  unit_cost: number;
  total_value: number;
  notes: string;
}

const stockLedgerSchema = new Schema<IStockLedger>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  location_id: { type: Schema.Types.ObjectId, ref: 'StockLocation', required: true },
  transaction_type: { type: String },
  transaction_date: { type: Date, default: Date.now },
  reference: { type: String },
  quantity_in: { type: Number, default: 0 },
  quantity_out: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  unit_cost: { type: Number, default: 0 },
  total_value: { type: Number, default: 0 },
  notes: { type: String },
}, defaultSchemaOptions);

stockLedgerSchema.index({ product_id: 1, transaction_date: -1 });
stockLedgerSchema.index({ location_id: 1 });
stockLedgerSchema.index({ transaction_type: 1 });
stockLedgerSchema.index({ transaction_date: -1 });
stockLedgerSchema.index({ location_id: 1, transaction_date: -1 });
stockLedgerSchema.index({ product_id: 1, location_id: 1 });

export default mongoose.models.StockLedger as mongoose.Model<IStockLedger> || mongoose.model<IStockLedger>('StockLedger', stockLedgerSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IStockReorderSuggestion extends Document {
  product_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  current_qty: number;
  min_qty: number;
  max_qty: number;
  suggested_qty: number;
  state: string;
}

const stockReorderSuggestionSchema = new Schema<IStockReorderSuggestion>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  current_qty: { type: Number, default: 0 },
  min_qty: { type: Number, default: 0 },
  max_qty: { type: Number, default: 0 },
  suggested_qty: { type: Number, default: 0 },
  state: { type: String, default: 'pending' },
}, defaultSchemaOptions);

stockReorderSuggestionSchema.index({ product_id: 1 });
stockReorderSuggestionSchema.index({ warehouse_id: 1 });
stockReorderSuggestionSchema.index({ state: 1 });
stockReorderSuggestionSchema.index({ state: 1, created_at: -1 });

export default mongoose.model<IStockReorderSuggestion>('StockReorderSuggestion', stockReorderSuggestionSchema);

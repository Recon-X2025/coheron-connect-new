import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ICurrency extends Document {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
  tenant_id: mongoose.Types.ObjectId;
}

const currencySchema = new Schema<ICurrency>({
  code: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  decimal_places: { type: Number, default: 2 },
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
}, defaultSchemaOptions);

currencySchema.index({ tenant_id: 1, code: 1 }, { unique: true });

const CurrencyModel = mongoose.model<ICurrency>('Currency', currencySchema);
export { CurrencyModel as Currency };
export default CurrencyModel;

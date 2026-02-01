import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IExchangeRate extends Document {
  tenant_id: mongoose.Types.ObjectId;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: Date;
  source: string;
}

const exchangeRateSchema = new Schema<IExchangeRate>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  from_currency: { type: String, required: true },
  to_currency: { type: String, required: true },
  rate: { type: Number, required: true },
  effective_date: { type: Date, required: true },
  source: { type: String, default: 'manual', enum: ['manual', 'api'] },
}, defaultSchemaOptions);

exchangeRateSchema.index({ tenant_id: 1, from_currency: 1, to_currency: 1, effective_date: -1 });

const ExchangeRateModel = mongoose.model<IExchangeRate>('ExchangeRate', exchangeRateSchema);
export { ExchangeRateModel as ExchangeRate };
export default ExchangeRateModel;

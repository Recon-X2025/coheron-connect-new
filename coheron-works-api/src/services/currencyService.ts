import Currency from '../models/Currency.js';
import ExchangeRate from '../models/ExchangeRate.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class CurrencyService {
  async convert(
    tenantId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<{ converted_amount: number; rate: number }> {
    if (fromCurrency === toCurrency) {
      return { converted_amount: amount, rate: 1 };
    }

    const rate = await this.getRate(tenantId, fromCurrency, toCurrency, date);
    return {
      converted_amount: Math.round(amount * rate * 100) / 100,
      rate,
    };
  }

  async getRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<number> {
    const effectiveDate = date || new Date();
    const tid = new mongoose.Types.ObjectId(tenantId);

    // Direct rate
    let exchangeRate = await ExchangeRate.findOne({
      tenant_id: tid,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      effective_date: { $lte: effectiveDate },
    }).sort({ effective_date: -1 });

    if (exchangeRate) return exchangeRate.rate;

    // Inverse rate
    exchangeRate = await ExchangeRate.findOne({
      tenant_id: tid,
      from_currency: toCurrency,
      to_currency: fromCurrency,
      effective_date: { $lte: effectiveDate },
    }).sort({ effective_date: -1 });

    if (exchangeRate) return Math.round((1 / exchangeRate.rate) * 1000000) / 1000000;

    throw new NotFoundError(`Exchange rate for ${fromCurrency} to ${toCurrency}`);
  }

  calculateGainLoss(
    originalAmount: number,
    originalRate: number,
    settlementRate: number
  ): { gain_loss: number; is_gain: boolean } {
    const originalBase = originalAmount * originalRate;
    const settlementBase = originalAmount * settlementRate;
    const diff = Math.round((settlementBase - originalBase) * 100) / 100;
    return { gain_loss: Math.abs(diff), is_gain: diff >= 0 };
  }

  async getActiveCurrencies(tenantId: string) {
    return Currency.find({ tenant_id: new mongoose.Types.ObjectId(tenantId), is_active: true }).sort({ code: 1 });
  }
}

export const currencyService = new CurrencyService();
export default currencyService;

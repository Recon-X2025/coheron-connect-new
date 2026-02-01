import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

interface PriceResult {
  unit_price: number;
  source: 'customer_specific' | 'promotional' | 'price_list' | 'product_list';
  discount_percent: number;
  final_price: number;
}

export class PricingEngineService {
  /**
   * Resolve price for a product with fallback chain:
   * Customer-specific → Promotional → Price list → Product list_price
   */
  async resolvePrice(
    tenantId: string,
    productId: string,
    partnerId: string,
    quantity: number = 1,
    date?: Date
  ): Promise<PriceResult> {
    const tid = new mongoose.Types.ObjectId(tenantId);
    const pid = new mongoose.Types.ObjectId(productId);
    const effectiveDate = date || new Date();

    // 1. Customer-specific pricing (from a PriceRule collection or embedded in Partner)
    // For now, we check a generic pricing collection
    const db = mongoose.connection.db;
    if (db) {
      const customerPrice = await db.collection('price_rules').findOne({
        tenant_id: tid,
        partner_id: new mongoose.Types.ObjectId(partnerId),
        product_id: pid,
        is_active: true,
        valid_from: { $lte: effectiveDate },
        $or: [{ valid_to: { $exists: false } }, { valid_to: { $gte: effectiveDate } }],
      });
      if (customerPrice) {
        const discount = customerPrice.discount_percent || 0;
        const price = customerPrice.unit_price as number;
        return { unit_price: price, source: 'customer_specific', discount_percent: discount, final_price: this.round(price * (1 - discount / 100)) };
      }

      // 2. Promotional pricing
      const promo = await db.collection('price_rules').findOne({
        tenant_id: tid,
        product_id: pid,
        rule_type: 'promotional',
        is_active: true,
        valid_from: { $lte: effectiveDate },
        valid_to: { $gte: effectiveDate },
        $or: [{ min_quantity: { $exists: false } }, { min_quantity: { $lte: quantity } }],
      });
      if (promo) {
        const discount = promo.discount_percent || 0;
        const price = promo.unit_price as number;
        return { unit_price: price, source: 'promotional', discount_percent: discount, final_price: this.round(price * (1 - discount / 100)) };
      }

      // 3. Price list
      const priceList = await db.collection('price_rules').findOne({
        tenant_id: tid,
        product_id: pid,
        rule_type: 'price_list',
        is_active: true,
        $or: [{ min_quantity: { $exists: false } }, { min_quantity: { $lte: quantity } }],
      });
      if (priceList) {
        return { unit_price: priceList.unit_price as number, source: 'price_list', discount_percent: 0, final_price: priceList.unit_price as number };
      }
    }

    // 4. Fallback to product list_price
    const product = await mongoose.connection.db?.collection('products').findOne({ _id: pid, tenant_id: tid });
    const listPrice = product?.list_price || product?.price || 0;
    return { unit_price: listPrice, source: 'product_list', discount_percent: 0, final_price: listPrice };
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}

export const pricingEngineService = new PricingEngineService();
export default pricingEngineService;

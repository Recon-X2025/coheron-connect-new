import CostLayer from '../models/CostLayer.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

interface ValuationResult {
  total_quantity: number;
  total_value: number;
  average_cost: number;
}

export class InventoryValuationService {
  async recordInward(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    unitCost: number,
    sourceType: string,
    sourceId?: string
  ): Promise<void> {
    await CostLayer.create({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      product_id: new mongoose.Types.ObjectId(productId),
      warehouse_id: new mongoose.Types.ObjectId(warehouseId),
      quantity,
      original_quantity: quantity,
      unit_cost: unitCost,
      source_type: sourceType,
      source_id: sourceId ? new mongoose.Types.ObjectId(sourceId) : undefined,
      date: new Date(),
    });
  }

  /**
   * FIFO outward: consume from oldest cost layers first
   */
  async recordOutwardFIFO(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number
  ): Promise<{ total_cost: number; layers_consumed: Array<{ layer_id: string; qty: number; unit_cost: number }> }> {
    const tid = new mongoose.Types.ObjectId(tenantId);
    const pid = new mongoose.Types.ObjectId(productId);
    const wid = new mongoose.Types.ObjectId(warehouseId);

    const layers = await CostLayer.find({
      tenant_id: tid, product_id: pid, warehouse_id: wid, quantity: { $gt: 0 },
    }).sort({ date: 1, created_at: 1 });

    let remaining = quantity;
    let totalCost = 0;
    const consumed: Array<{ layer_id: string; qty: number; unit_cost: number }> = [];

    for (const layer of layers) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, layer.quantity);
      totalCost += take * layer.unit_cost;
      consumed.push({ layer_id: layer._id.toString(), qty: take, unit_cost: layer.unit_cost });

      layer.quantity -= take;
      remaining -= take;
      await layer.save();
    }

    if (remaining > 0) {
      throw new ValidationError(`Insufficient stock. Short by ${remaining} units for product ${productId}`);
    }

    return { total_cost: Math.round(totalCost * 100) / 100, layers_consumed: consumed };
  }

  /**
   * Weighted average outward
   */
  async recordOutwardWeightedAvg(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number
  ): Promise<{ total_cost: number; avg_cost: number }> {
    const valuation = await this.getValuation(tenantId, productId, warehouseId);

    if (valuation.total_quantity < quantity) {
      throw new ValidationError(`Insufficient stock. Available: ${valuation.total_quantity}, Required: ${quantity}`);
    }

    const totalCost = Math.round(quantity * valuation.average_cost * 100) / 100;

    // Proportionally reduce layers
    const tid = new mongoose.Types.ObjectId(tenantId);
    const pid = new mongoose.Types.ObjectId(productId);
    const wid = new mongoose.Types.ObjectId(warehouseId);

    const layers = await CostLayer.find({
      tenant_id: tid, product_id: pid, warehouse_id: wid, quantity: { $gt: 0 },
    }).sort({ date: 1 });

    let remaining = quantity;
    for (const layer of layers) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, layer.quantity);
      layer.quantity -= take;
      remaining -= take;
      await layer.save();
    }

    return { total_cost: totalCost, avg_cost: valuation.average_cost };
  }

  async getValuation(tenantId: string, productId: string, warehouseId?: string): Promise<ValuationResult> {
    const match: any = {
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      product_id: new mongoose.Types.ObjectId(productId),
      quantity: { $gt: 0 },
    };
    if (warehouseId) match.warehouse_id = new mongoose.Types.ObjectId(warehouseId);

    const result = await CostLayer.aggregate([
      { $match: match },
      { $group: { _id: null, total_quantity: { $sum: '$quantity' }, total_value: { $sum: { $multiply: ['$quantity', '$unit_cost'] } } } },
    ]);

    if (!result.length) return { total_quantity: 0, total_value: 0, average_cost: 0 };

    const { total_quantity, total_value } = result[0];
    return {
      total_quantity,
      total_value: Math.round(total_value * 100) / 100,
      average_cost: total_quantity > 0 ? Math.round((total_value / total_quantity) * 100) / 100 : 0,
    };
  }

  async getValuationReport(tenantId: string): Promise<any[]> {
    const tid = new mongoose.Types.ObjectId(tenantId);
    return CostLayer.aggregate([
      { $match: { tenant_id: tid, quantity: { $gt: 0 } } },
      { $group: {
        _id: { product_id: '$product_id', warehouse_id: '$warehouse_id' },
        total_quantity: { $sum: '$quantity' },
        total_value: { $sum: { $multiply: ['$quantity', '$unit_cost'] } },
        layer_count: { $sum: 1 },
      }},
      { $project: {
        product_id: '$_id.product_id',
        warehouse_id: '$_id.warehouse_id',
        total_quantity: 1,
        total_value: { $round: ['$total_value', 2] },
        average_cost: { $cond: [{ $gt: ['$total_quantity', 0] }, { $round: [{ $divide: ['$total_value', '$total_quantity'] }, 2] }, 0] },
        layer_count: 1,
        _id: 0,
      }},
      { $sort: { product_id: 1 } },
    ]);
  }
}

export const inventoryValuationService = new InventoryValuationService();
export default inventoryValuationService;

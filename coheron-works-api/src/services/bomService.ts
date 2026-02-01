import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

interface BOMLine {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_cost?: number;
  is_phantom?: boolean;
  bom_id?: string;
}

interface FlatRequirement {
  product_id: string;
  product_name?: string;
  total_quantity: number;
  unit_cost: number;
  total_cost: number;
  level: number;
}

export class BOMService {
  /**
   * Explode a BOM recursively, handling phantom assemblies
   */
  async explodeBOM(
    tenantId: string,
    bomId: string,
    parentQuantity: number = 1,
    level: number = 0,
    visited: Set<string> = new Set()
  ): Promise<FlatRequirement[]> {
    if (visited.has(bomId)) {
      throw new ValidationError('Circular BOM reference detected: ' + bomId);
    }
    visited.add(bomId);

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const bom = await db.collection('manufacturing_boms').findOne({
      _id: new mongoose.Types.ObjectId(bomId),
      tenant_id: new mongoose.Types.ObjectId(tenantId),
    });

    if (!bom) throw new NotFoundError('BOM: ' + bomId);

    const requirements: FlatRequirement[] = [];

    for (const line of (bom.components || bom.lines || [])) {
      const requiredQty = (line.quantity || 0) * parentQuantity;
      const unitCost = line.unit_cost || 0;

      // Check if component has its own BOM (phantom or sub-assembly)
      const childBom = await db.collection('manufacturing_boms').findOne({
        tenant_id: new mongoose.Types.ObjectId(tenantId),
        product_id: new mongoose.Types.ObjectId(line.product_id),
        is_active: { $ne: false },
      });

      if (childBom && (line.is_phantom || childBom.is_phantom)) {
        // Phantom: explode further, don't include this level
        const childReqs = await this.explodeBOM(tenantId, childBom._id.toString(), requiredQty, level + 1, visited);
        requirements.push(...childReqs);
      } else if (childBom) {
        // Sub-assembly: include this product AND explode
        requirements.push({
          product_id: line.product_id.toString(),
          product_name: line.product_name,
          total_quantity: requiredQty,
          unit_cost: unitCost,
          total_cost: Math.round(requiredQty * unitCost * 100) / 100,
          level,
        });
        const childReqs = await this.explodeBOM(tenantId, childBom._id.toString(), requiredQty, level + 1, visited);
        requirements.push(...childReqs);
      } else {
        // Raw material
        requirements.push({
          product_id: line.product_id.toString(),
          product_name: line.product_name,
          total_quantity: requiredQty,
          unit_cost: unitCost,
          total_cost: Math.round(requiredQty * unitCost * 100) / 100,
          level,
        });
      }
    }

    visited.delete(bomId);
    return requirements;
  }

  /**
   * Flatten and aggregate requirements by product
   */
  async getFlattenedRequirements(tenantId: string, bomId: string, quantity: number = 1): Promise<FlatRequirement[]> {
    const exploded = await this.explodeBOM(tenantId, bomId, quantity);
    const map = new Map<string, FlatRequirement>();

    for (const req of exploded) {
      const existing = map.get(req.product_id);
      if (existing) {
        existing.total_quantity += req.total_quantity;
        existing.total_cost += req.total_cost;
      } else {
        map.set(req.product_id, { ...req });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Calculate total BOM cost
   */
  async calculateBOMCost(tenantId: string, bomId: string, quantity: number = 1): Promise<{ material_cost: number; lines: FlatRequirement[] }> {
    const lines = await this.getFlattenedRequirements(tenantId, bomId, quantity);
    const materialCost = lines.reduce((sum, l) => sum + l.total_cost, 0);
    return { material_cost: Math.round(materialCost * 100) / 100, lines };
  }
}

export const bomService = new BOMService();
export default bomService;

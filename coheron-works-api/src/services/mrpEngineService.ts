import mongoose from 'mongoose';
import bomService from './bomService.js';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

interface PlannedOrder { type: 'mo' | 'po'; product_id: string; product_name?: string; quantity: number; due_date: Date; source: string; }

export class MRPEngineService {
  async runMRP(tenantId: string): Promise<{ planned_orders: PlannedOrder[]; summary: any }> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    // 1. Gather demand: confirmed sale orders + MO components + safety stock
    const saleOrders = await db.collection('sale_orders').find({ tenant_id: tid, state: 'sale', delivery_status: { $ne: 'delivered' } }).toArray();
    const demand = new Map<string, number>();
    for (const so of saleOrders) {
      for (const line of so.order_line || []) {
        const pid = line.product_id?.toString();
        if (pid) demand.set(pid, (demand.get(pid) || 0) + (line.product_uom_qty || 0));
      }
    }
    // Safety stock
    const products = await db.collection('products').find({ tenant_id: tid }).toArray();
    for (const p of products) {
      if (p.safety_stock && p.safety_stock > 0) {
        const pid = p._id.toString();
        demand.set(pid, (demand.get(pid) || 0) + p.safety_stock);
      }
    }
    // 2. Gather supply: current stock + incoming POs/MOs
    const supply = new Map<string, number>();
    const stockItems = await db.collection('stock_items').find({ tenant_id: tid }).toArray();
    for (const s of stockItems) { const pid = s.product_id?.toString(); if (pid) supply.set(pid, (supply.get(pid) || 0) + (s.quantity || 0)); }
    const pendingPOs = await db.collection('purchase_orders').find({ tenant_id: tid, state: { $in: ['confirmed', 'partially_received'] } }).toArray();
    for (const po of pendingPOs) { for (const l of po.lines || []) { const pid = l.product_id?.toString(); if (pid) supply.set(pid, (supply.get(pid) || 0) + Math.max(0, (l.quantity || 0) - (l.received_qty || 0))); } }
    // 3. Net requirements
    const planned: PlannedOrder[] = [];
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    for (const [pid, demandQty] of demand.entries()) {
      const supplyQty = supply.get(pid) || 0;
      const net = demandQty - supplyQty;
      if (net <= 0) continue;
      const product = productMap.get(pid);
      // Has BOM? -> planned MO, else -> planned PO
      const bom = await db.collection('manufacturing_boms').findOne({ tenant_id: tid, product_id: new mongoose.Types.ObjectId(pid), is_active: { $ne: false } });
      const leadDays = product?.lead_time_days || 7;
      const dueDate = new Date(Date.now() + leadDays * 86400000);
      if (bom) {
        planned.push({ type: 'mo', product_id: pid, product_name: product?.name, quantity: net, due_date: dueDate, source: 'mrp' });
        // Explode BOM for component demand
        try {
          const reqs = await bomService.getFlattenedRequirements(tenantId, bom._id.toString(), net);
          for (const req of reqs) {
            const compSupply = supply.get(req.product_id) || 0;
            const compNet = req.total_quantity - compSupply;
            if (compNet > 0) {
              const compBom = await db.collection('manufacturing_boms').findOne({ tenant_id: tid, product_id: new mongoose.Types.ObjectId(req.product_id), is_active: { $ne: false } });
              planned.push({ type: compBom ? 'mo' : 'po', product_id: req.product_id, product_name: req.product_name, quantity: compNet, due_date: new Date(dueDate.getTime() - leadDays * 86400000 / 2), source: 'mrp-bom' });
            }
          }
        } catch (e) { /* BOM explosion failed, skip components */ }
      } else {
        planned.push({ type: 'po', product_id: pid, product_name: product?.name, quantity: net, due_date: dueDate, source: 'mrp' });
      }
    }
    // Store planned orders
    if (planned.length) {
      await db.collection('mrp_planned_orders').deleteMany({ tenant_id: tid, status: 'planned' });
      await db.collection('mrp_planned_orders').insertMany(planned.map(p => ({ ...p, tenant_id: tid, product_id: new mongoose.Types.ObjectId(p.product_id), status: 'planned', created_at: new Date() })));
    }
    return { planned_orders: planned, summary: { total_mos: planned.filter(p => p.type === 'mo').length, total_pos: planned.filter(p => p.type === 'po').length, products_with_shortage: demand.size } };
  }
}
export const mrpEngineService = new MRPEngineService();
export default mrpEngineService;

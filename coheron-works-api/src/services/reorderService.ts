import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

export class ReorderService {
  async checkReorderPoints(tenantId: string): Promise<any[]> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const products = await db.collection('products').find({ tenant_id: tid, reorder_point: { $gt: 0 } }).toArray();
    const suggestions: any[] = [];
    for (const p of products) {
      const stock = await db.collection('stock_items').aggregate([{ $match: { tenant_id: tid, product_id: p._id } }, { $group: { _id: null, total: { $sum: '$quantity' } } }]).toArray();
      const currentQty = stock[0]?.total || 0;
      if (currentQty <= p.reorder_point) {
        const orderQty = Math.max((p.reorder_quantity || p.reorder_point * 2) - currentQty, 0);
        if (orderQty > 0) suggestions.push({ product_id: p._id.toString(), product_name: p.name, current_stock: currentQty, reorder_point: p.reorder_point, suggested_quantity: orderQty, preferred_vendor_id: p.preferred_vendor_id?.toString() });
      }
    }
    return suggestions;
  }

  async generatePurchaseOrdersFromSuggestions(tenantId: string, suggestions: any[]): Promise<any[]> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    // Group by vendor
    const vendorGroups = new Map<string, any[]>();
    for (const s of suggestions) {
      const vid = s.preferred_vendor_id || 'unassigned';
      if (!vendorGroups.has(vid)) vendorGroups.set(vid, []);
      vendorGroups.get(vid)!.push(s);
    }
    const pos: any[] = [];
    for (const [vendorId, items] of vendorGroups.entries()) {
      if (vendorId === 'unassigned') continue;
      const po = { tenant_id: tid, vendor_id: new mongoose.Types.ObjectId(vendorId), po_number: 'AUTO-' + Date.now(), date: new Date(), lines: items.map((i: any) => ({ product_id: new mongoose.Types.ObjectId(i.product_id), product_name: i.product_name, quantity: i.suggested_quantity, unit_price: 0, received_qty: 0, billed_qty: 0 })), state: 'draft', source: 'reorder', created_at: new Date(), updated_at: new Date() };
      await db.collection('purchase_orders').insertOne(po);
      pos.push(po);
    }
    return pos;
  }
}
export const reorderService = new ReorderService();
export default reorderService;

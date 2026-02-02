import { offlineDb, getDeviceId } from '../../../services/offlineDb.js';
import { syncManager } from '../../../services/syncManager.js';

interface POSLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

export class OfflinePOS {
  static async createOrder(sessionId: string, lines: POSLineItem[], paymentMethod: string): Promise<any> {
    const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unit_price * (1 - l.discount / 100)), 0);
    const taxTotal = lines.reduce((sum, l) => {
      const lineNet = l.quantity * l.unit_price * (1 - l.discount / 100);
      return sum + (lineNet * l.tax_rate / 100);
    }, 0);

    const order = {
      _id: 'pos_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      session_id: sessionId,
      name: `POS-OFFLINE-${Date.now()}`,
      lines: lines.map(l => ({
        ...l,
        line_total: l.quantity * l.unit_price * (1 - l.discount / 100),
        tax_amount: l.quantity * l.unit_price * (1 - l.discount / 100) * l.tax_rate / 100,
      })),
      amount_subtotal: Math.round(subtotal * 100) / 100,
      amount_tax: Math.round(taxTotal * 100) / 100,
      amount_total: Math.round((subtotal + taxTotal) * 100) / 100,
      payment_method: paymentMethod,
      state: 'paid',
      order_date: new Date().toISOString(),
      device_id: getDeviceId(),
      _sync_status: 'pending' as const,
      _local_updated_at: Date.now(),
    };

    await offlineDb.pos_orders.put(order);

    // Queue for sync
    await syncManager.queueOperation('pos_orders', 'create', order);

    // Update local stock (decrement)
    for (const line of lines) {
      const product = await offlineDb.products.get(line.product_id);
      if (product) {
        const newQty = (product.qty_on_hand || product.quantity_on_hand || 0) - line.quantity;
        await offlineDb.products.update(line.product_id, { qty_on_hand: Math.max(0, newQty) });
      }
    }

    return order;
  }

  static async getProducts(): Promise<any[]> {
    return offlineDb.products.toArray();
  }

  static async getOrders(sessionId?: string): Promise<any[]> {
    let query = offlineDb.pos_orders.orderBy('_local_updated_at');
    const orders = await query.reverse().limit(100).toArray();
    return sessionId ? orders.filter(o => o.session_id === sessionId) : orders;
  }
}

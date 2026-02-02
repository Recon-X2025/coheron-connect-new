import { offlineDb, getDeviceId } from '../../../services/offlineDb.js';
import { syncManager } from '../../../services/syncManager.js';

export class OfflineFieldSales {
  static async createOrder(partnerId: string, lines: Array<{ product_id: string; product_name: string; quantity: number; unit_price: number; discount: number; tax_rate: number }>): Promise<any> {
    const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unit_price * (1 - l.discount / 100)), 0);
    const taxTotal = lines.reduce((sum, l) => {
      const lineNet = l.quantity * l.unit_price * (1 - l.discount / 100);
      return sum + (lineNet * l.tax_rate / 100);
    }, 0);

    const order = {
      _id: 'so_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      name: `SO-OFFLINE-${Date.now()}`,
      partner_id: partnerId,
      order_lines: lines.map(l => ({
        ...l,
        line_total: Math.round(l.quantity * l.unit_price * (1 - l.discount / 100) * 100) / 100,
        tax_amount: Math.round(l.quantity * l.unit_price * (1 - l.discount / 100) * l.tax_rate / 100 * 100) / 100,
      })),
      amount_untaxed: Math.round(subtotal * 100) / 100,
      amount_tax: Math.round(taxTotal * 100) / 100,
      amount_total: Math.round((subtotal + taxTotal) * 100) / 100,
      status: 'draft',
      order_date: new Date().toISOString(),
      device_id: getDeviceId(),
      _sync_status: 'pending' as const,
      _local_updated_at: Date.now(),
    };

    await offlineDb.saleorders.put(order);
    await syncManager.queueOperation('saleorders', 'create', order);
    return order;
  }

  static async getPartners(): Promise<any[]> {
    return offlineDb.partners.toArray();
  }

  static async getProducts(): Promise<any[]> {
    return offlineDb.products.toArray();
  }

  static async getOfflineOrders(): Promise<any[]> {
    return offlineDb.saleorders.where('_sync_status').equals('pending').toArray();
  }
}

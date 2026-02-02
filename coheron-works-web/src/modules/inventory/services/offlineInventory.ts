import { offlineDb, getDeviceId } from '../../../services/offlineDb.js';
import { syncManager } from '../../../services/syncManager.js';

export class OfflineInventory {
  static async createCountSheet(name: string, warehouseId: string, productIds: string[]): Promise<any> {
    const products = await Promise.all(productIds.map(id => offlineDb.products.get(id)));

    const countSheet = {
      _id: 'count_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      name,
      warehouse_id: warehouseId,
      state: 'in_progress',
      lines: products.filter(Boolean).map(p => ({
        product_id: p!._id,
        product_name: p!.name,
        theoretical_qty: p!.qty_on_hand || p!.quantity_on_hand || 0,
        counted_qty: null,
        difference: null,
      })),
      created_at: new Date().toISOString(),
      device_id: getDeviceId(),
      _sync_status: 'pending' as const,
      _local_updated_at: Date.now(),
    };

    await offlineDb.inventorycounts.put(countSheet);
    return countSheet;
  }

  static async updateCountLine(countSheetId: string, productId: string, countedQty: number): Promise<void> {
    const sheet = await offlineDb.inventorycounts.get(countSheetId);
    if (!sheet) return;

    const line = sheet.lines?.find((l: any) => l.product_id === productId);
    if (line) {
      line.counted_qty = countedQty;
      line.difference = countedQty - (line.theoretical_qty || 0);
    }

    sheet._local_updated_at = Date.now();
    sheet._sync_status = 'pending';
    await offlineDb.inventorycounts.put(sheet);
  }

  static async finalizeCount(countSheetId: string): Promise<void> {
    const sheet = await offlineDb.inventorycounts.get(countSheetId);
    if (!sheet) return;

    sheet.state = 'done';
    sheet._local_updated_at = Date.now();
    await offlineDb.inventorycounts.put(sheet);

    await syncManager.queueOperation('inventorycounts', 'create', sheet);
  }

  static async scanBarcode(barcode: string): Promise<any | null> {
    const products = await offlineDb.products.toArray();
    return products.find(p => p.barcode === barcode || p.default_code === barcode) || null;
  }

  static async getCountSheets(): Promise<any[]> {
    return offlineDb.inventorycounts.toArray();
  }
}

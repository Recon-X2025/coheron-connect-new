import Dexie, { type Table } from 'dexie';

export interface OfflineRecord {
  _id: string;
  [key: string]: any;
  _sync_status?: 'synced' | 'pending' | 'conflict';
  _local_updated_at?: number;
  _server_updated_at?: string;
}

export interface SyncQueueItem {
  id?: number;
  collection: string;
  operation: 'create' | 'update' | 'delete';
  document_id?: string;
  data: Record<string, any>;
  timestamp: number;
  device_id: string;
  user_id: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retry_count: number;
  error?: string;
}

class CoheronOfflineDB extends Dexie {
  products!: Table<OfflineRecord, string>;
  partners!: Table<OfflineRecord, string>;
  pos_orders!: Table<OfflineRecord, string>;
  stockquants!: Table<OfflineRecord, string>;
  pos_sessions!: Table<OfflineRecord, string>;
  saleorders!: Table<OfflineRecord, string>;
  inventorycounts!: Table<OfflineRecord, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('coheron_offline');
    this.version(1).stores({
      products: '_id, name, updated_at, _sync_status',
      partners: '_id, name, email, updated_at, _sync_status',
      pos_orders: '_id, name, order_date, updated_at, _sync_status',
      stockquants: '_id, product_id, updated_at, _sync_status',
      pos_sessions: '_id, name, updated_at, _sync_status',
      saleorders: '_id, name, order_date, updated_at, _sync_status',
      inventorycounts: '_id, name, updated_at, _sync_status',
      syncQueue: '++id, collection, status, timestamp',
    });
  }
}

export const offlineDb = new CoheronOfflineDB();

// Helper to get device ID (persistent)
export function getDeviceId(): string {
  let id = localStorage.getItem('coheron_device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('coheron_device_id', id);
  }
  return id;
}

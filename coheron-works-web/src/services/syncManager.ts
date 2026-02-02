import { offlineDb, getDeviceId, type SyncQueueItem } from './offlineDb.js';
import type { OfflineRecord } from './offlineDb.js';

const API_BASE = import.meta.env.VITE_API_URL || '';
const SYNC_INTERVAL = 30000;

type SyncListener = (status: { syncing: boolean; pendingCount: number; lastSync: Date | null; error?: string }) => void;

class SyncManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private syncing = false;
  private lastSyncTime: Date | null = null;
  private listeners: Set<SyncListener> = new Set();

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    const pendingCount = await offlineDb.syncQueue.where('status').equals('pending').count();
    const status = { syncing: this.syncing, pendingCount, lastSync: this.lastSyncTime };
    this.listeners.forEach(fn => fn(status));
  }

  private getToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      if (navigator.onLine) this.sync();
    }, SYNC_INTERVAL);
    // Sync immediately when coming back online
    window.addEventListener('online', () => this.sync());
    // Initial sync
    if (navigator.onLine) this.sync();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async sync() {
    if (this.syncing || !navigator.onLine) return;
    this.syncing = true;
    this.notify();

    try {
      await this.push();
      await this.pull();
      this.lastSyncTime = new Date();
    } catch (err: any) {
      console.error('Sync failed:', err.message);
    }

    this.syncing = false;
    this.notify();
  }

  async pull() {
    const token = this.getToken();
    const since = this.lastSyncTime?.toISOString() || new Date(0).toISOString();

    const res = await fetch(`${API_BASE}/api/offline-sync/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ collections: ['products', 'partners', 'pos_orders', 'stockquants', 'saleorders'], since }),
    });

    if (!res.ok) return;
    const data = await res.json();

    for (const [collName, collData] of Object.entries(data) as [string, any][]) {
      const table = (offlineDb as any)[collName];
      if (!table) continue;

      for (const doc of collData.data || []) {
        const existing = await table.get(doc._id?.toString?.() || doc._id);
        const record: OfflineRecord = {
          ...doc,
          _id: doc._id?.toString?.() || doc._id,
          _sync_status: 'synced',
          _server_updated_at: doc.updated_at,
        };
        if (existing?._sync_status === 'pending') {
          record._sync_status = 'conflict';
        } else {
          await table.put(record);
        }
      }

      // Remove deleted records
      for (const id of collData.deleted_ids || []) {
        await table.delete(id);
      }
    }
  }

  async push() {
    const pending = await offlineDb.syncQueue.where('status').equals('pending').toArray();
    if (!pending.length) return;

    const token = this.getToken();
    const deviceId = getDeviceId();

    const operations = pending.map(op => ({
      id: String(op.id),
      collection: op.collection,
      operation: op.operation,
      document_id: op.document_id,
      data: op.data,
      timestamp: op.timestamp,
      device_id: deviceId,
      user_id: op.user_id,
    }));

    const res = await fetch(`${API_BASE}/api/offline-sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ operations }),
    });

    if (!res.ok) return;
    const result = await res.json();

    // Mark synced items
    for (const op of pending) {
      const isConflict = result.conflicts?.some((c: any) => c.operation_id === String(op.id));
      const isError = result.errors?.some((e: any) => e.operation_id === String(op.id));

      await offlineDb.syncQueue.update(op.id!, {
        status: isConflict ? 'conflict' : isError ? 'failed' : 'synced',
        error: isConflict ? 'Server version newer' : isError ? result.errors.find((e: any) => e.operation_id === String(op.id))?.error : undefined,
      });
    }

    // Clean up synced items
    await offlineDb.syncQueue.where('status').equals('synced').delete();
  }

  async queueOperation(collection: string, operation: 'create' | 'update' | 'delete', data: any, documentId?: string) {
    const userId = ''; // will be filled from auth context
    await offlineDb.syncQueue.add({
      collection,
      operation,
      document_id: documentId,
      data,
      timestamp: Date.now(),
      device_id: getDeviceId(),
      user_id: userId,
      status: 'pending',
      retry_count: 0,
    });
    this.notify();
    // If online, sync immediately
    if (navigator.onLine) this.sync();
  }

  async getPendingCount(): Promise<number> {
    return offlineDb.syncQueue.where('status').equals('pending').count();
  }

  async getConflicts(): Promise<SyncQueueItem[]> {
    return offlineDb.syncQueue.where('status').equals('conflict').toArray();
  }
}

export const syncManager = new SyncManager();

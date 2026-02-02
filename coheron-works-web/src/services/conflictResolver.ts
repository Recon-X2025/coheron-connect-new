import { offlineDb } from './offlineDb.js';

export interface ConflictItem {
  id: number;
  collection: string;
  document_id?: string;
  local_data: Record<string, any>;
  server_data?: Record<string, any>;
  timestamp: number;
}

export type Resolution = 'keep_local' | 'keep_server' | 'merge';

export class ConflictResolver {
  static async getConflicts(): Promise<ConflictItem[]> {
    const items = await offlineDb.syncQueue.where('status').equals('conflict').toArray();
    return items.map(item => ({
      id: item.id!,
      collection: item.collection,
      document_id: item.document_id,
      local_data: item.data,
      timestamp: item.timestamp,
    }));
  }

  static async resolve(conflictId: number, resolution: Resolution, mergedData?: Record<string, any>): Promise<void> {
    const item = await offlineDb.syncQueue.get(conflictId);
    if (!item) return;

    switch (resolution) {
      case 'keep_local':
        // Re-queue as pending to push again (with force flag)
        await offlineDb.syncQueue.update(conflictId, {
          status: 'pending',
          data: { ...item.data, _force_overwrite: true },
          timestamp: Date.now(),
          retry_count: 0,
        });
        break;
      case 'keep_server':
        // Just remove the conflict - server version wins
        await offlineDb.syncQueue.delete(conflictId);
        // Also update local IDB to remove pending status
        if (item.document_id) {
          const table = (offlineDb as any)[item.collection];
          if (table) {
            const doc = await table.get(item.document_id);
            if (doc) await table.update(item.document_id, { _sync_status: 'synced' });
          }
        }
        break;
      case 'merge':
        if (!mergedData) throw new Error('mergedData required for merge resolution');
        await offlineDb.syncQueue.update(conflictId, {
          status: 'pending',
          data: mergedData,
          timestamp: Date.now(),
          retry_count: 0,
        });
        break;
    }
  }

  static fieldDiff(local: Record<string, any>, server: Record<string, any>): Array<{ field: string; local: any; server: any }> {
    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
    const diffs: Array<{ field: string; local: any; server: any }> = [];
    for (const key of allKeys) {
      if (key.startsWith('_')) continue;
      if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
        diffs.push({ field: key, local: local[key], server: server[key] });
      }
    }
    return diffs;
  }
}

import mongoose from 'mongoose';
import logger from '../shared/utils/logger.js';

interface SyncOperation {
  id: string;
  collection: string;
  operation: 'create' | 'update' | 'delete';
  document_id?: string;
  data: Record<string, any>;
  timestamp: number;
  device_id: string;
  user_id: string;
}

interface SyncResult {
  synced: number;
  conflicts: { operation_id: string; reason: string; server_version: any }[];
  errors: { operation_id: string; error: string }[];
}

interface SyncManifest {
  collections: {
    name: string;
    description: string;
    sync_strategy: 'full' | 'incremental' | 'snapshot';
    offline_writable: boolean;
    max_records?: number;
    priority: number;
  }[];
  sync_interval_ms: number;
  max_offline_hours: number;
}

// Collections allowed for offline sync
const SYNCABLE_COLLECTIONS: SyncManifest['collections'] = [
  { name: 'products', description: 'Product catalog', sync_strategy: 'incremental', offline_writable: false, max_records: 10000, priority: 1 },
  { name: 'partners', description: 'Customer directory', sync_strategy: 'incremental', offline_writable: true, max_records: 5000, priority: 2 },
  { name: 'pos_orders', description: 'POS orders', sync_strategy: 'incremental', offline_writable: true, priority: 1 },
  { name: 'stockquants', description: 'Stock levels', sync_strategy: 'incremental', offline_writable: false, max_records: 10000, priority: 3 },
  { name: 'pos_sessions', description: 'POS sessions', sync_strategy: 'incremental', offline_writable: true, priority: 1 },
  { name: 'pickingtasks', description: 'Warehouse picking tasks', sync_strategy: 'incremental', offline_writable: true, max_records: 500, priority: 2 },
  { name: 'saleorders', description: 'Sale orders (field sales)', sync_strategy: 'incremental', offline_writable: true, max_records: 1000, priority: 2 },
  { name: 'attendances', description: 'Attendance records', sync_strategy: 'incremental', offline_writable: true, max_records: 1000, priority: 3 },
  { name: 'inventorycounts', description: 'Inventory count sheets', sync_strategy: 'full', offline_writable: true, max_records: 500, priority: 2 },
];

class OfflineSyncService {
  getManifest(): SyncManifest {
    return {
      collections: SYNCABLE_COLLECTIONS,
      sync_interval_ms: 30000, // 30 seconds when online
      max_offline_hours: 72,
    };
  }

  async pullChanges(
    collections: string[],
    since: Date,
    options: { tenant_id?: string; limit?: number } = {}
  ): Promise<Record<string, { data: any[]; deleted_ids: string[]; last_sync: string }>> {
    const db = mongoose.connection.db;
    const result: Record<string, { data: any[]; deleted_ids: string[]; last_sync: string }> = {};
    const tenantMatch = options.tenant_id ? { tenant_id: new mongoose.Types.ObjectId(options.tenant_id) } : {};

    for (const collName of collections) {
      const syncConfig = SYNCABLE_COLLECTIONS.find(c => c.name === collName);
      if (!syncConfig) continue;

      const limit = Math.min(options.limit || syncConfig.max_records || 10000, 10000);

      // Get updated/created records since last sync
      const data = await db?.collection(collName).find({
        updated_at: { $gte: since },
        ...tenantMatch,
      }).sort({ updated_at: 1 }).limit(limit).toArray() || [];

      // Get soft-deleted IDs (check for deleted_at or is_deleted flag)
      const deletedDocs = await db?.collection(collName).find({
        $or: [
          { deleted_at: { $gte: since } },
          { is_deleted: true, updated_at: { $gte: since } },
        ],
        ...tenantMatch,
      }).project({ _id: 1 }).toArray() || [];

      result[collName] = {
        data,
        deleted_ids: deletedDocs.map((d: any) => d._id.toString()),
        last_sync: new Date().toISOString(),
      };
    }

    return result;
  }

  async pushChanges(operations: SyncOperation[], tenantId?: string): Promise<SyncResult> {
    const db = mongoose.connection.db;
    const result: SyncResult = { synced: 0, conflicts: [], errors: [] };
    const tenantOid = tenantId ? new mongoose.Types.ObjectId(tenantId) : undefined;

    // Sort by timestamp to apply in order
    operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const op of operations) {
      const syncConfig = SYNCABLE_COLLECTIONS.find(c => c.name === op.collection);
      if (!syncConfig || !syncConfig.offline_writable) {
        result.errors.push({ operation_id: op.id, error: 'Collection ' + op.collection + ' is not writable offline' });
        continue;
      }

      try {
        switch (op.operation) {
          case 'create': {
            const doc: Record<string, any> = { ...op.data, created_at: new Date(op.timestamp), updated_at: new Date(op.timestamp), sync_device_id: op.device_id };
            if (tenantOid) doc.tenant_id = tenantOid;
            await db?.collection(op.collection).insertOne(doc);
            result.synced++;
            break;
          }
          case 'update': {
            if (!op.document_id) {
              result.errors.push({ operation_id: op.id, error: 'document_id required for update' });
              continue;
            }

            // Conflict detection: check if server version is newer
            const serverDoc = await db?.collection(op.collection).findOne({ _id: new mongoose.Types.ObjectId(op.document_id) });
            if (serverDoc && serverDoc.updated_at && new Date(serverDoc.updated_at).getTime() > op.timestamp) {
              result.conflicts.push({
                operation_id: op.id,
                reason: 'Server version is newer than offline change',
                server_version: serverDoc,
              });
              continue;
            }

            await db?.collection(op.collection).updateOne(
              { _id: new mongoose.Types.ObjectId(op.document_id) },
              { $set: { ...op.data, updated_at: new Date(), sync_device_id: op.device_id } },
            );
            result.synced++;
            break;
          }
          case 'delete': {
            if (!op.document_id) {
              result.errors.push({ operation_id: op.id, error: 'document_id required for delete' });
              continue;
            }
            // Soft delete
            await db?.collection(op.collection).updateOne(
              { _id: new mongoose.Types.ObjectId(op.document_id) },
              { $set: { is_deleted: true, deleted_at: new Date(), sync_device_id: op.device_id } },
            );
            result.synced++;
            break;
          }
        }
      } catch (err: any) {
        result.errors.push({ operation_id: op.id, error: err.message });
      }
    }

    logger.info({ synced: result.synced, conflicts: result.conflicts.length, errors: result.errors.length }, 'Offline sync push completed');
    return result;
  }

  // Generate a service worker registration script
  getServiceWorkerConfig(): Record<string, any> {
    return {
      cache_name: 'coheron-erp-offline-v1',
      precache_urls: [
        '/',
        '/index.html',
        '/manifest.json',
      ],
      cache_strategies: {
        api: 'network-first',
        static: 'cache-first',
        images: 'stale-while-revalidate',
      },
      offline_fallback: '/offline.html',
      background_sync: {
        queue_name: 'coheron-offline-queue',
        max_retention_time: 72 * 60, // 72 hours in minutes
      },
      indexed_db: {
        database_name: 'coheron_offline',
        version: 1,
        stores: SYNCABLE_COLLECTIONS.filter(c => c.offline_writable).map(c => ({
          name: c.name,
          key_path: '_id',
          indexes: ['updated_at', 'sync_status'],
        })),
      },
    };
  }
}

export const offlineSyncService = new OfflineSyncService();

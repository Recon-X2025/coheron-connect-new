import mongoose from 'mongoose';
import logger from '../shared/utils/logger.js';

export class APIUsageTracker {
  static async trackRequest(apiKeyId: string, tenantId: string, endpoint: string, method: string, statusCode: number): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) return;

    const now = new Date();
    const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`;

    try {
      // Hourly bucket in MongoDB
      await db.collection('api_usage_hourly').updateOne(
        { api_key_id: apiKeyId, hour: hourKey },
        {
          $inc: {
            total_requests: 1,
            [`status_${statusCode}`]: 1,
            [`methods.${method}`]: 1,
          },
          $set: { tenant_id: new mongoose.Types.ObjectId(tenantId), updated_at: now },
          $setOnInsert: { created_at: now },
        },
        { upsert: true }
      );
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to track API usage');
    }
  }

  static async getDailyUsage(apiKeyId: string, days = 30): Promise<any[]> {
    const db = mongoose.connection.db;
    if (!db) return [];

    const since = new Date(Date.now() - days * 86400000);
    const sinceHour = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}T00`;

    return db.collection('api_usage_hourly').aggregate([
      { $match: { api_key_id: apiKeyId, hour: { $gte: sinceHour } } },
      { $group: {
        _id: { $substr: ['$hour', 0, 10] }, // Group by date
        total_requests: { $sum: '$total_requests' },
      }},
      { $sort: { _id: 1 } },
    ]).toArray();
  }

  static async getTenantUsage(tenantId: string, days = 30): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) return {};

    const since = new Date(Date.now() - days * 86400000);
    const sinceHour = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}T00`;

    const usage = await db.collection('api_usage_hourly').aggregate([
      { $match: { tenant_id: new mongoose.Types.ObjectId(tenantId), hour: { $gte: sinceHour } } },
      { $group: { _id: null, total: { $sum: '$total_requests' } } },
    ]).toArray();

    return { total_requests: usage[0]?.total || 0, period_days: days };
  }
}

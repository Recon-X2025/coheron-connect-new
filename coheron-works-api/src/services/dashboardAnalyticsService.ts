import mongoose from 'mongoose';

export class DashboardAnalyticsService {
  async getSalesDashboard(tenantId: string): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [thisMonthSales] = await db.collection('sale_orders').aggregate([{ $match: { tenant_id: tid, state: { $in: ['sale','done'] }, date_order: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount_total' }, count: { $sum: 1 } } }]).toArray() || [null];
    const [lastMonthSales] = await db.collection('sale_orders').aggregate([{ $match: { tenant_id: tid, state: { $in: ['sale','done'] }, date_order: { $gte: lastMonth, $lt: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount_total' }, count: { $sum: 1 } } }]).toArray() || [null];
    const topProducts = await db.collection('sale_orders').aggregate([{ $match: { tenant_id: tid, state: { $in: ['sale','done'] }, date_order: { $gte: thisMonth } } }, { $unwind: '$order_line' }, { $group: { _id: '$order_line.product_id', total: { $sum: '$order_line.price_subtotal' }, qty: { $sum: '$order_line.product_uom_qty' } } }, { $sort: { total: -1 } }, { $limit: 10 }]).toArray();
    const pendingQuotations = await db.collection('quotations').countDocuments({ tenant_id: tid, state: { $in: ['draft','sent'] } });
    const overdueInvoices = await db.collection('invoices').countDocuments({ tenant_id: tid, status: { $nin: ['paid','cancelled'] }, due_date: { $lt: now } });
    return { this_month: { revenue: thisMonthSales?.total || 0, orders: thisMonthSales?.count || 0 }, last_month: { revenue: lastMonthSales?.total || 0, orders: lastMonthSales?.count || 0 }, growth_percent: lastMonthSales?.total ? Math.round(((thisMonthSales?.total || 0) - lastMonthSales.total) / lastMonthSales.total * 10000) / 100 : 0, top_products: topProducts, pending_quotations: pendingQuotations, overdue_invoices: overdueInvoices };
  }

  async getFinanceDashboard(tenantId: string): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [revenue] = await db.collection('invoices').aggregate([{ $match: { tenant_id: tid, status: { $ne: 'cancelled' }, date: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount_total' }, paid: { $sum: '$amount_paid' } } }]).toArray() || [null];
    const [expenses] = await db.collection('vendor_bills').aggregate([{ $match: { tenant_id: tid, status: { $ne: 'cancelled' }, date: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount_total' } } }]).toArray() || [null];
    const cashBalance = await db.collection('journal_entries').aggregate([{ $match: { tenant_id: tid, status: 'posted' } }, { $unwind: '$lines' }, { $match: { 'lines.account_type': 'bank' } }, { $group: { _id: null, total: { $sum: { $subtract: ['$lines.debit', '$lines.credit'] } } } }]).toArray();
    return { revenue: revenue?.total || 0, collected: revenue?.paid || 0, expenses: expenses?.total || 0, net_income: (revenue?.total || 0) - (expenses?.total || 0), cash_balance: cashBalance[0]?.total || 0 };
  }

  async getInventoryDashboard(tenantId: string): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const totalStock = await db.collection('stock_items').aggregate([{ $match: { tenant_id: tid } }, { $group: { _id: null, total_qty: { $sum: '$quantity' }, total_value: { $sum: { $multiply: ['$quantity', { $ifNull: ['$unit_cost', 0] }] } } } }]).toArray();
    const lowStock = await db.collection('products').aggregate([{ $match: { tenant_id: tid, reorder_point: { $gt: 0 } } }, { $lookup: { from: 'stock_items', let: { pid: '$_id', tid: '$tenant_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$product_id', '$$pid'] }, { $eq: ['$tenant_id', '$$tid'] }] } } }, { $group: { _id: null, qty: { $sum: '$quantity' } } }], as: 'stock' } }, { $addFields: { current_qty: { $ifNull: [{ $arrayElemAt: ['$stock.qty', 0] }, 0] } } }, { $match: { $expr: { $lte: ['$current_qty', '$reorder_point'] } } }, { $project: { name: 1, current_qty: 1, reorder_point: 1 } }]).toArray();
    return { total_items: totalStock[0]?.total_qty || 0, total_value: Math.round((totalStock[0]?.total_value || 0) * 100) / 100, low_stock_items: lowStock, low_stock_count: lowStock.length };
  }
}
export const dashboardAnalyticsService = new DashboardAnalyticsService();
export default dashboardAnalyticsService;

import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { POSAnalyticsSnapshot } from '../models/POSAnalyticsSnapshot.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';

const router = express.Router();

// Today's live dashboard stats
router.get('/dashboard', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { store_id } = req.query;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const filter: any = { tenant_id, processed_at: { $gte: todayStart }, status: 'completed' };
  if (store_id) filter.store_id = store_id;

  const txns = await PaymentTransaction.find(filter);
  const total_sales = txns.reduce((s, t) => s + t.amount, 0);
  const total_tips = txns.reduce((s, t) => s + (t.tip_amount || 0), 0);
  const total_transactions = txns.length;
  const avg_transaction_value = total_transactions > 0 ? total_sales / total_transactions : 0;

  // Sales by hour
  const sales_by_hour: { hour: number; amount: number; count: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const hourTxns = txns.filter(t => t.processed_at && new Date(t.processed_at).getHours() === h);
    sales_by_hour.push({ hour: h, amount: hourTxns.reduce((s, t) => s + t.amount, 0), count: hourTxns.length });
  }

  // Payment method breakdown
  const methodMap: Record<string, { amount: number; count: number }> = {};
  txns.forEach(t => {
    if (!methodMap[t.method]) methodMap[t.method] = { amount: 0, count: 0 };
    methodMap[t.method].amount += t.amount;
    methodMap[t.method].count += 1;
  });
  const payment_method_breakdown = Object.entries(methodMap).map(([method, data]) => ({ method, ...data }));

  res.json({ total_sales, total_transactions, avg_transaction_value, total_tips, sales_by_hour, payment_method_breakdown });
}));

// Daily snapshot
router.get('/daily/:date', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const date = new Date(req.params.date); date.setHours(0, 0, 0, 0);
  const snapshot = await POSAnalyticsSnapshot.findOne({ tenant_id, date });
  if (!snapshot) return res.status(404).json({ error: 'No snapshot for this date' });
  res.json(snapshot);
}));

// Date range summary
router.get('/range', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { from, to, store_id } = req.query;
  const filter: any = { tenant_id };
  if (store_id) filter.store_id = store_id;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from as string);
    if (to) filter.date.$lte = new Date(to as string);
  }
  const snapshots = await POSAnalyticsSnapshot.find(filter).sort({ date: 1 });
  const totals = {
    total_sales: snapshots.reduce((s, sn) => s + sn.total_sales, 0),
    total_transactions: snapshots.reduce((s, sn) => s + sn.total_transactions, 0),
    items_sold: snapshots.reduce((s, sn) => s + sn.items_sold, 0),
    returns_amount: snapshots.reduce((s, sn) => s + sn.returns_amount, 0),
    discounts_amount: snapshots.reduce((s, sn) => s + sn.discounts_amount, 0),
    tax_collected: snapshots.reduce((s, sn) => s + sn.tax_collected, 0),
    days: snapshots.length,
  };
  res.json({ totals, daily: snapshots });
}));

// Hourly heatmap
router.get('/hourly-heatmap', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { from, to } = req.query;
  const filter: any = { tenant_id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from as string);
    if (to) filter.date.$lte = new Date(to as string);
  }
  const snapshots = await POSAnalyticsSnapshot.find(filter);
  // Build heatmap: day_of_week x hour
  const heatmap: Record<number, Record<number, number>> = {};
  for (let d = 0; d < 7; d++) { heatmap[d] = {}; for (let h = 0; h < 24; h++) heatmap[d][h] = 0; }
  snapshots.forEach(sn => {
    const dow = new Date(sn.date).getDay();
    sn.sales_by_hour?.forEach(sh => { heatmap[dow][sh.hour] = (heatmap[dow][sh.hour] || 0) + sh.amount; });
  });
  res.json(heatmap);
}));

// Product mix
router.get('/product-mix', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { from, to } = req.query;
  const filter: any = { tenant_id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from as string);
    if (to) filter.date.$lte = new Date(to as string);
  }
  const snapshots = await POSAnalyticsSnapshot.find(filter);
  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  snapshots.forEach(sn => {
    sn.top_products?.forEach(p => {
      if (!productMap[p.product_id]) productMap[p.product_id] = { name: p.name, quantity: 0, revenue: 0 };
      productMap[p.product_id].quantity += p.quantity;
      productMap[p.product_id].revenue += p.revenue;
    });
  });
  const products = Object.entries(productMap).map(([id, data]) => ({ product_id: id, ...data })).sort((a, b) => b.revenue - a.revenue);
  res.json(products);
}));

// Cashier performance
router.get('/cashier-performance', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { from, to } = req.query;
  const filter: any = { tenant_id, status: 'completed' };
  if (from || to) {
    filter.processed_at = {};
    if (from) filter.processed_at.$gte = new Date(from as string);
    if (to) filter.processed_at.$lte = new Date(to as string);
  }
  const result = await PaymentTransaction.aggregate([
    { $match: filter },
    { $group: { _id: '$created_by', total_sales: { $sum: '$amount' }, total_tips: { $sum: '$tip_amount' }, transactions: { $sum: 1 } } },
    { $sort: { total_sales: -1 } },
  ]);
  res.json(result);
}));

// Store/period comparison
router.get('/comparison', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { store_ids, from, to } = req.query;
  const filter: any = { tenant_id };
  if (store_ids) filter.store_id = { $in: (store_ids as string).split(',') };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from as string);
    if (to) filter.date.$lte = new Date(to as string);
  }
  const result = await POSAnalyticsSnapshot.aggregate([
    { $match: filter },
    { $group: { _id: '$store_id', total_sales: { $sum: '$total_sales' }, total_transactions: { $sum: '$total_transactions' }, items_sold: { $sum: '$items_sold' }, days: { $sum: 1 } } },
    { $sort: { total_sales: -1 } },
  ]);
  res.json(result);
}));

export default router;

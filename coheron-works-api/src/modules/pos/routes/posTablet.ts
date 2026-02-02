import express from 'express';
import mongoose from 'mongoose';
import PosOrder from '../../../models/PosOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// Tablet POS configuration
router.get('/config', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  res.json({
    tenant_id: tenantId,
    layout: 'grid',
    categories_position: 'left',
    quick_actions: ['cash', 'card', 'upi', 'split'],
    show_images: true,
    font_size: 'large',
    touch_mode: true,
    offline_enabled: true,
    auto_sync_interval: 30,
    currency: 'INR',
    tax_inclusive: true,
    receipt_auto_print: true,
  });
}));

// Lightweight product catalog for tablet
router.get('/catalog', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { category, search, page = 1, limit = 50 } = req.query;

  const Product = mongoose.model('Product');

  const filter: any = { tenant_id: tenantId, is_active: true };
  if (category) filter.category = category;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const products = await Product.find(filter)
    .select('name sku price category image_url barcode tax_rate')
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .lean();

  const total = await Product.countDocuments(filter);

  res.json({ products, total, page: Number(page), limit: Number(limit) });
}));

// Quick sale - minimal payload for fast checkout
router.post('/quick-sale', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { items, payment_method, payment_amount, customer_id } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items required' });
  }

  const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

  const transaction = {
    tenant_id: tenantId,
    items,
    total,
    payment_method: payment_method || 'cash',
    payment_amount: payment_amount || total,
    change: (payment_amount || total) - total,
    customer_id,
    source: 'tablet',
    created_at: new Date(),
    created_by: req.user?.userId,
  };

  const order_number = `POS-${Date.now()}`;
  const order = await PosOrder.create({
    name: order_number,
    order_number,
    partner_id: customer_id || undefined,
    amount_total: total,
    amount_paid: payment_amount || total,
    payment_method: payment_method || 'cash',
    payment_status: 'paid',
    state: 'done',
    user_id: req.user?.userId,
    cashier_id: req.user?.userId,
    paid_at: new Date(),
    lines: items.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.name,
      qty: item.quantity,
      price_unit: item.price,
      discount: item.discount || 0,
    })),
  });

  res.status(201).json({ success: true, transaction: order });
}));

// Offline sync - get data needed for offline operation
router.get('/offline-sync', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { since } = req.query;

  const Product = mongoose.model('Product');

  const filter: any = { tenant_id: tenantId, is_active: true };
  if (since) filter.updated_at = { $gt: new Date(since as string) };

  const products = await Product.find(filter)
    .select('name sku price category image_url barcode tax_rate')
    .lean();

  res.json({
    products,
    synced_at: new Date().toISOString(),
  });
}));

// Push offline transactions
router.post('/sync', asyncHandler(async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions must be an array' });
  }

  const results = [];
  for (const txn of transactions) {
    results.push({
      local_id: txn.local_id,
      status: 'synced',
      server_id: new Date().getTime().toString(),
    });
  }

  res.json({ synced: results.length, results });
}));

export default router;

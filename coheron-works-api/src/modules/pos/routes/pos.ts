import express from 'express';
import PosOrder from '../../../models/PosOrder.js';
import PosSession from '../../../models/PosSession.js';
import PosTerminal from '../../../models/PosTerminal.js';
import PosPayment from '../../../models/PosPayment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { createOrder as createRazorpayOrder } from '../../crossmodule/services/paymentService.js';

const router = express.Router();

// ============================================
// POS ORDERS
// ============================================

// Get all POS orders
router.get('/orders', authenticate, asyncHandler(async (req, res) => {
  const { state, store_id, terminal_id, session_id, start_date, end_date } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (store_id) filter.store_id = store_id;
  if (terminal_id) filter.terminal_id = terminal_id;
  if (session_id) filter.session_id = session_id;
  if (start_date) filter.created_at = { ...(filter.created_at || {}), $gte: new Date(start_date as string) };
  if (end_date) filter.created_at = { ...(filter.created_at || {}), $lte: new Date(end_date as string) };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    PosOrder.find(filter)
      .populate('store_id', 'name')
      .populate('terminal_id', 'name')
      .populate('session_id', 'session_number')
      .populate('partner_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, PosOrder
  );

  const data = paginatedResult.data.map((o: any) => ({
    ...o,
    store_name: o.store_id?.name,
    terminal_name: o.terminal_id?.name,
    session_number: o.session_id?.session_number,
    partner_name: o.partner_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get POS order by ID
router.get('/orders/:id', authenticate, asyncHandler(async (req, res) => {
  const order = await PosOrder.findById(req.params.id)
    .populate('store_id', 'name')
    .populate('terminal_id', 'name')
    .populate('lines.product_id', 'name default_code')
    .lean();

  if (!order) {
    return res.status(404).json({ error: 'POS order not found' });
  }

  const orderObj: any = order;
  const lines = (orderObj.lines || []).map((line: any) => ({
    ...line,
    product_name: line.product_id?.name,
    product_code: line.product_id?.default_code,
  }));

  res.json({
    ...orderObj,
    store_name: (order as any).store_id?.name,
    terminal_name: (order as any).terminal_id?.name,
    lines,
  });
}));

// Create POS order
router.post('/orders', authenticate, asyncHandler(async (req, res) => {
  const {
    store_id, terminal_id, session_id, partner_id, customer_name,
    customer_phone, customer_email, order_type, amount_untaxed,
    amount_tax, amount_total, amount_discount, payment_method,
    user_id, cashier_id, lines,
  } = req.body;

  // Generate order number
  const orderCount = await PosOrder.countDocuments({ order_number: { $regex: /^POS-/ } });
  const orderNumber = `POS-${String(orderCount + 1).padStart(6, '0')}`;

  const order = await PosOrder.create({
    name: orderNumber,
    order_number: orderNumber,
    store_id, terminal_id, session_id, partner_id,
    customer_name, customer_phone, customer_email,
    order_type: order_type || 'sale',
    state: 'draft',
    amount_untaxed: amount_untaxed || 0,
    amount_tax: amount_tax || 0,
    amount_total: amount_total || 0,
    amount_discount: amount_discount || 0,
    amount_paid: amount_total || 0,
    payment_method,
    payment_status: 'pending',
    user_id, cashier_id,
    lines: (lines || []).map((line: any) => ({
      product_id: line.product_id,
      qty: line.qty,
      price_unit: line.price_unit,
      discount: line.discount || 0,
      tax_id: line.tax_id,
    })),
  });

  res.status(201).json(order);
}));

// Update POS order
router.put('/orders/:id', authenticate, asyncHandler(async (req, res) => {
  const {
    customer_name, customer_phone, customer_email,
    amount_untaxed, amount_tax, amount_total, amount_discount,
    payment_method, state, lines,
  } = req.body;

  const updateData: any = {
    customer_name, customer_phone, customer_email,
    amount_untaxed, amount_tax, amount_total, amount_discount,
    payment_method, state,
  };

  if (lines && Array.isArray(lines)) {
    updateData.lines = lines.map((line: any) => ({
      product_id: line.product_id,
      qty: line.qty,
      price_unit: line.price_unit,
      discount: line.discount || 0,
      tax_id: line.tax_id,
    }));
  }

  const order = await PosOrder.findByIdAndUpdate(req.params.id, updateData, { new: true })
    .populate('store_id', 'name')
    .populate('terminal_id', 'name');

  if (!order) {
    return res.status(404).json({ error: 'POS order not found' });
  }

  res.json({
    ...order.toObject(),
    store_name: (order.store_id as any)?.name,
    terminal_name: (order.terminal_id as any)?.name,
  });
}));

// Park order
router.post('/orders/:id/park', authenticate, asyncHandler(async (req, res) => {
  await PosOrder.findByIdAndUpdate(req.params.id, { is_parked: true });
  res.json({ message: 'Order parked successfully' });
}));

// Void order
router.post('/orders/:id/void', authenticate, asyncHandler(async (req, res) => {
  const { void_reason, void_user_id } = req.body;
  await PosOrder.findByIdAndUpdate(req.params.id, {
    is_void: true,
    void_reason,
    void_user_id,
    void_date: new Date(),
    state: 'cancelled',
  });
  res.json({ message: 'Order voided successfully' });
}));

// Process return
router.post('/orders/:id/return', authenticate, asyncHandler(async (req, res) => {
  const { return_lines, refund_method } = req.body;

  const originalOrder = await PosOrder.findById(req.params.id);
  if (!originalOrder) {
    return res.status(404).json({ error: 'Original order not found' });
  }

  const returnCount = await PosOrder.countDocuments({ order_number: { $regex: /^RET-/ } });
  const returnNumber = `RET-${String(returnCount + 1).padStart(6, '0')}`;

  const returnOrder = await PosOrder.create({
    name: returnNumber,
    order_number: returnNumber,
    store_id: originalOrder.store_id,
    terminal_id: originalOrder.terminal_id,
    session_id: originalOrder.session_id,
    order_type: 'return',
    state: 'confirmed',
    amount_total: 0,
    payment_method: refund_method,
    payment_status: 'refunded',
  });

  res.json({ message: 'Return processed successfully', return_order: returnOrder });
}));

// ============================================
// POS SESSIONS
// ============================================

// Get all sessions
router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
  const { state, store_id, terminal_id, start_date, end_date } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (store_id) filter.store_id = store_id;
  if (terminal_id) filter.terminal_id = terminal_id;
  if (start_date) filter.start_at = { ...(filter.start_at || {}), $gte: new Date(start_date as string) };
  if (end_date) filter.start_at = { ...(filter.start_at || {}), $lte: new Date(end_date as string) };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    PosSession.find(filter)
      .populate('store_id', 'name')
      .populate('terminal_id', 'name')
      .populate('user_id', 'name')
      .sort({ start_at: -1 })
      .lean(),
    pagination, filter, PosSession
  );

  const data = paginatedResult.data.map((s: any) => ({
    ...s,
    store_name: s.store_id?.name,
    terminal_name: s.terminal_id?.name,
    user_name: s.user_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get session by ID
router.get('/sessions/:id', authenticate, asyncHandler(async (req, res) => {
  const session = await PosSession.findById(req.params.id)
    .populate('store_id', 'name')
    .populate('terminal_id', 'name')
    .populate('user_id', 'name')
    .lean();

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    ...session,
    store_name: (session as any).store_id?.name,
    terminal_name: (session as any).terminal_id?.name,
    user_name: (session as any).user_id?.name,
  });
}));

// Create session
router.post('/sessions', authenticate, asyncHandler(async (req, res) => {
  const { store_id, terminal_id, user_id, opening_balance } = req.body;

  const sessionCount = await PosSession.countDocuments({ session_number: { $regex: /^SESS-/ } });
  const sessionNumber = `SESS-${String(sessionCount + 1).padStart(6, '0')}`;

  const session = await PosSession.create({
    name: sessionNumber,
    session_number: sessionNumber,
    store_id, terminal_id, user_id,
    opening_balance: opening_balance || 0,
    state: 'opening',
  });

  res.status(201).json(session);
}));

// Open session
router.post('/sessions/:id/open', authenticate, asyncHandler(async (req, res) => {
  await PosSession.findByIdAndUpdate(req.params.id, { state: 'opened', start_at: new Date() });
  res.json({ message: 'Session opened successfully' });
}));

// Close session
router.post('/sessions/:id/close', authenticate, asyncHandler(async (req, res) => {
  const { closing_balance } = req.body;

  // Calculate totals from orders
  const orders = await PosOrder.find({ session_id: req.params.id, state: 'paid' }).lean();

  const totals = {
    total_orders: orders.length,
    total_sales: orders.reduce((sum, o) => sum + (o.amount_total || 0), 0),
    total_cash: orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.amount_paid || 0), 0),
    total_card: orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + (o.amount_paid || 0), 0),
    total_upi: orders.filter(o => o.payment_method === 'upi').reduce((sum, o) => sum + (o.amount_paid || 0), 0),
    total_other: orders.filter(o => !['cash', 'card', 'upi'].includes(o.payment_method || '')).reduce((sum, o) => sum + (o.amount_paid || 0), 0),
  };

  const expectedBalance = totals.total_cash;
  const difference = (closing_balance || 0) - expectedBalance;

  await PosSession.findByIdAndUpdate(req.params.id, {
    state: 'closed',
    closing_balance,
    expected_balance: expectedBalance,
    difference,
    ...totals,
    stop_at: new Date(),
  });

  res.json({ message: 'Session closed successfully' });
}));

// Reconcile cash
router.post('/sessions/:id/reconcile', authenticate, asyncHandler(async (req, res) => {
  const { closing_balance, notes } = req.body;
  await PosSession.findByIdAndUpdate(req.params.id, { closing_balance, notes });
  res.json({ message: 'Cash reconciled successfully' });
}));

// ============================================
// POS TERMINALS
// ============================================

// Get all terminals
router.get('/terminals', authenticate, asyncHandler(async (req, res) => {
  const { store_id, is_active } = req.query;
  const filter: any = {};

  if (store_id) filter.store_id = store_id;
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    PosTerminal.find(filter)
      .populate('store_id', 'name')
      .sort({ name: 1 })
      .lean(),
    pagination, filter, PosTerminal
  );

  const data = paginatedResult.data.map((t: any) => ({
    ...t,
    store_name: t.store_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get terminal by ID
router.get('/terminals/:id', authenticate, asyncHandler(async (req, res) => {
  const terminal = await PosTerminal.findById(req.params.id).populate('store_id', 'name').lean();

  if (!terminal) {
    return res.status(404).json({ error: 'Terminal not found' });
  }

  res.json({
    ...terminal,
    store_name: (terminal as any).store_id?.name,
  });
}));

// Create terminal
router.post('/terminals', authenticate, asyncHandler(async (req, res) => {
  const { name, code, store_id, is_active, printer_id, cash_drawer_enabled, barcode_scanner_enabled, hardware_config } = req.body;

  const terminal = await PosTerminal.create({
    name, code, store_id,
    is_active: is_active !== undefined ? is_active : true,
    printer_id,
    cash_drawer_enabled: cash_drawer_enabled !== undefined ? cash_drawer_enabled : true,
    barcode_scanner_enabled: barcode_scanner_enabled !== undefined ? barcode_scanner_enabled : true,
    hardware_config: hardware_config || null,
  });

  res.status(201).json(terminal);
}));

// Update terminal
router.put('/terminals/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, code, store_id, is_active, printer_id, cash_drawer_enabled, barcode_scanner_enabled, hardware_config } = req.body;

  const terminal = await PosTerminal.findByIdAndUpdate(req.params.id, {
    name, code, store_id, is_active, printer_id,
    cash_drawer_enabled, barcode_scanner_enabled,
    hardware_config: hardware_config || null,
  }, { new: true });

  if (!terminal) {
    return res.status(404).json({ error: 'Terminal not found' });
  }

  res.json(terminal);
}));

// Delete terminal
router.delete('/terminals/:id', authenticate, asyncHandler(async (req, res) => {
  const terminal = await PosTerminal.findByIdAndDelete(req.params.id);

  if (!terminal) {
    return res.status(404).json({ error: 'Terminal not found' });
  }

  res.json({ message: 'Terminal deleted successfully' });
}));

// ============================================
// POS PAYMENTS
// ============================================

// Process payment
router.post('/payments', authenticate, asyncHandler(async (req, res) => {
  const { order_id, payment_method, amount, currency, gateway_transaction_id, gateway_response } = req.body;

  const payment = await PosPayment.create({
    order_id, payment_method, amount,
    currency: currency || 'INR',
    gateway_transaction_id,
    gateway_response: gateway_response || null,
    payment_status: 'success',
  });

  // Update order payment status
  await PosOrder.findByIdAndUpdate(order_id, {
    payment_status: 'paid',
    $inc: { amount_paid: amount },
    paid_at: new Date(),
  });

  res.status(201).json(payment);
}));

// Initiate Razorpay payment for POS order
router.post('/payments/razorpay', authenticate, asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  const order = await PosOrder.findById(order_id).lean();
  if (!order) {
    return res.status(404).json({ error: 'POS order not found' });
  }

  const razorpayOrder = await createRazorpayOrder({
    amount: Math.round((order.amount_total || 0) * 100),
    currency: 'INR',
    receipt: order.order_number,
    notes: { pos_order_id: order_id },
  });

  res.json({ razorpay_order_id: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency });
}));

// Process refund
router.post('/payments/refund', authenticate, asyncHandler(async (req, res) => {
  const { payment_id, amount, reason } = req.body;

  await PosPayment.findByIdAndUpdate(payment_id, { payment_status: 'refunded' });
  res.json({ message: 'Refund processed successfully' });
}));

// Legacy route for backward compatibility
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    PosOrder.find().sort({ created_at: -1 }).lean(),
    pagination, {}, PosOrder
  );

  res.json(paginatedResult);
}));

router.post('/', authenticate, async (req, res) => {
  const originalUrl = req.url;
  req.url = '/orders';
  router(req, res, () => {
    req.url = originalUrl;
  });
});

export default router;

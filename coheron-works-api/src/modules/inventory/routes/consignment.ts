import express from 'express';
import { ConsignmentAgreement } from '../models/ConsignmentAgreement.js';
import { ConsignmentStock } from '../models/ConsignmentStock.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ==================== Agreements ====================

// GET /agreements
router.get('/agreements', asyncHandler(async (req: any, res) => {
  const { status, type, partner_id, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (partner_id) filter.partner_id = partner_id;

  const skip = (Number(page) - 1) * Number(limit);
  const [agreements, total] = await Promise.all([
    ConsignmentAgreement.find(filter)
      .populate('partner_id', 'name')
      .populate('warehouse_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ConsignmentAgreement.countDocuments(filter),
  ]);

  res.json({ data: agreements, total, page: Number(page), limit: Number(limit) });
}));

// POST /agreements
router.post('/agreements', asyncHandler(async (req: any, res) => {
  const count = await ConsignmentAgreement.countDocuments({ tenant_id: req.user.tenant_id });
  const agreement_number = `CA-${String(count + 1).padStart(5, '0')}`;

  const agreement = await ConsignmentAgreement.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
    agreement_number,
    created_by: req.user._id,
  });
  res.status(201).json(agreement);
}));

// GET /agreements/:id
router.get('/agreements/:id', asyncHandler(async (req: any, res) => {
  const agreement = await ConsignmentAgreement.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('partner_id', 'name email')
    .populate('warehouse_id', 'name')
    .populate('items.product_id', 'name sku')
    .lean();
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  res.json(agreement);
}));

// PUT /agreements/:id
router.put('/agreements/:id', asyncHandler(async (req: any, res) => {
  const agreement = await ConsignmentAgreement.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  res.json(agreement);
}));

// DELETE /agreements/:id
router.delete('/agreements/:id', asyncHandler(async (req: any, res) => {
  const agreement = await ConsignmentAgreement.findOneAndDelete({
    _id: req.params.id,
    tenant_id: req.user.tenant_id,
    status: 'draft',
  });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found or cannot be deleted' });
  res.json({ message: 'Agreement deleted' });
}));

// POST /agreements/:id/activate
router.post('/agreements/:id/activate', asyncHandler(async (req: any, res) => {
  const agreement = await ConsignmentAgreement.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (agreement.status !== 'draft') return res.status(400).json({ error: 'Only draft agreements can be activated' });

  agreement.status = 'active';
  await agreement.save();

  // Initialize stock records for each product
  for (const item of agreement.items) {
    await ConsignmentStock.findOneAndUpdate(
      {
        tenant_id: req.user.tenant_id,
        agreement_id: agreement._id,
        product_id: item.product_id,
      },
      {
        tenant_id: req.user.tenant_id,
        agreement_id: agreement._id,
        product_id: item.product_id,
        warehouse_id: agreement.warehouse_id,
        quantity_on_hand: 0,
        quantity_sold: 0,
        quantity_returned: 0,
      },
      { upsert: true, new: true }
    );
  }

  res.json(agreement);
}));

// POST /agreements/:id/terminate
router.post('/agreements/:id/terminate', asyncHandler(async (req: any, res) => {
  const agreement = await ConsignmentAgreement.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (agreement.status !== 'active') return res.status(400).json({ error: 'Only active agreements can be terminated' });

  agreement.status = 'terminated';
  await agreement.save();
  res.json(agreement);
}));

// ==================== Stock ====================

// GET /stock
router.get('/stock', asyncHandler(async (req: any, res) => {
  const { agreement_id, product_id, warehouse_id } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (agreement_id) filter.agreement_id = agreement_id;
  if (product_id) filter.product_id = product_id;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const stock = await ConsignmentStock.find(filter)
    .populate('agreement_id', 'agreement_number type')
    .populate('product_id', 'name sku')
    .populate('warehouse_id', 'name')
    .lean();

  res.json(stock);
}));

// PUT /stock/:id
router.put('/stock/:id', asyncHandler(async (req: any, res) => {
  const stock = await ConsignmentStock.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!stock) return res.status(404).json({ error: 'Stock record not found' });
  res.json(stock);
}));

// POST /stock/:id/reconcile
router.post('/stock/:id/reconcile', asyncHandler(async (req: any, res) => {
  const stock = await ConsignmentStock.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!stock) return res.status(404).json({ error: 'Stock record not found' });

  if (req.body.quantity_on_hand !== undefined) stock.quantity_on_hand = req.body.quantity_on_hand;
  if (req.body.quantity_sold !== undefined) stock.quantity_sold = req.body.quantity_sold;
  if (req.body.quantity_returned !== undefined) stock.quantity_returned = req.body.quantity_returned;
  stock.last_reconciled_at = new Date();
  await stock.save();

  res.json(stock);
}));

// POST /agreements/:id/settle - settlement
router.post('/agreements/:id/settle', asyncHandler(async (req: any, res) => {
  const agreement = await ConsignmentAgreement.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('items.product_id', 'name sku')
    .lean();
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const stocks = await ConsignmentStock.find({
    tenant_id: req.user.tenant_id,
    agreement_id: agreement._id,
  }).lean();

  const settlementLines: any[] = [];
  let totalAmount = 0;

  for (const stock of stocks) {
    const item = agreement.items.find((i: any) => i.product_id._id.toString() === stock.product_id.toString());
    if (!item) continue;

    const soldQty = stock.quantity_sold;
    const lineAmount = soldQty * item.price;
    const commission = lineAmount * (item.commission_rate / 100);

    settlementLines.push({
      product_id: stock.product_id,
      quantity_sold: soldQty,
      price: item.price,
      line_amount: lineAmount,
      commission_rate: item.commission_rate,
      commission_amount: commission,
      net_amount: lineAmount - commission,
    });

    totalAmount += lineAmount - commission;
  }

  res.json({
    agreement_id: agreement._id,
    agreement_number: agreement.agreement_number,
    settlement_date: new Date(),
    lines: settlementLines,
    total_amount: totalAmount,
  });
}));

export default router;

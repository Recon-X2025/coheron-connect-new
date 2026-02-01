import { Router } from 'express';
import PurchaseOrder from '../../../models/PurchaseOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import purchaseLifecycleService from '../../../services/purchaseLifecycleService.js';
import documentNumberingService from '../../../services/documentNumberingService.js';
import { validate } from '../../../shared/middleware/validate.js';
import { objectIdParam } from '../../../shared/schemas/common.js';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema } from '../schemas.js';

const router = Router();

router.get('/', asyncHandler(async (req: any, res: any) => {
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.state) filter.state = req.query.state;
  const pos = await PurchaseOrder.find(filter).populate('vendor_id').sort({ created_at: -1 }).limit(100);
  res.json(pos);
}));

router.get('/:id', asyncHandler(async (req: any, res: any) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('vendor_id');
  if (!po) return res.status(404).json({ error: 'PO not found' });
  res.json(po);
}));

router.post('/', validate({ body: createPurchaseOrderSchema }), asyncHandler(async (req: any, res: any) => {
  const number = await documentNumberingService.getNextNumber(req.user.tenant_id.toString(), 'purchase_order');
  const po = await PurchaseOrder.create({ ...req.body, tenant_id: req.user.tenant_id, po_number: number, state: 'draft' });
  res.status(201).json(po);
}));

router.put('/:id', validate({ params: objectIdParam, body: updatePurchaseOrderSchema }), asyncHandler(async (req: any, res: any) => {
  const po = await PurchaseOrder.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true, runValidators: true });
  if (!po) return res.status(404).json({ error: 'PO not found' });
  res.json(po);
}));

router.post('/:id/confirm', validate({ params: objectIdParam }), asyncHandler(async (req: any, res: any) => {
  const po = await purchaseLifecycleService.confirmPO(req.user.tenant_id.toString(), req.params.id);
  res.json(po);
}));

router.post('/:id/receive', validate({ params: objectIdParam }), asyncHandler(async (req: any, res: any) => {
  const result = await purchaseLifecycleService.createGRNFromPO(req.user.tenant_id.toString(), req.params.id, req.body.lines || []);
  res.json(result);
}));

router.post('/:id/create-bill', validate({ params: objectIdParam }), asyncHandler(async (req: any, res: any) => {
  const result = await purchaseLifecycleService.createBillFromPO(req.user.tenant_id.toString(), req.params.id, req.user._id.toString());
  res.json(result);
}));

router.delete('/:id', asyncHandler(async (req: any, res: any) => {
  await PurchaseOrder.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  res.json({ message: 'Deleted' });
}));

export default router;

import { Router } from 'express';
import Quotation from '../../../models/Quotation.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import salesLifecycleService from '../../../services/salesLifecycleService.js';
import documentNumberingService from '../../../services/documentNumberingService.js';
import { validate } from '../../../shared/middleware/validate.js';
import { objectIdParam } from '../../../shared/schemas/common.js';
import { createQuotationSchema, updateQuotationSchema } from '../schemas.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: any, res: any) => {
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.state) filter.state = req.query.state;
  const quotations = await Quotation.find(filter).populate('partner_id').sort({ created_at: -1 }).limit(100);
  res.json(quotations);
}));

router.get('/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const q = await Quotation.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('partner_id');
  if (!q) return res.status(404).json({ error: 'Quotation not found' });
  res.json(q);
}));

router.post('/', authenticate, validate({ body: createQuotationSchema }), asyncHandler(async (req: any, res: any) => {
  const number = await documentNumberingService.getNextNumber(req.user.tenant_id.toString(), 'quotation');
  const q = await Quotation.create({ ...req.body, tenant_id: req.user.tenant_id, quotation_number: number, state: 'draft' });
  res.status(201).json(q);
}));

router.put('/:id', authenticate, validate({ params: objectIdParam, body: updateQuotationSchema }), asyncHandler(async (req: any, res: any) => {
  const q = await Quotation.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true, runValidators: true });
  if (!q) return res.status(404).json({ error: 'Quotation not found' });
  res.json(q);
}));

router.post('/:id/send', authenticate, validate({ params: objectIdParam }), asyncHandler(async (req: any, res: any) => {
  const q = await Quotation.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user.tenant_id, state: 'draft' }, { $set: { state: 'sent' } }, { new: true });
  if (!q) return res.status(400).json({ error: 'Cannot send quotation' });
  res.json(q);
}));

router.post('/:id/convert-to-order', authenticate, validate({ params: objectIdParam }), asyncHandler(async (req: any, res: any) => {
  const order = await salesLifecycleService.convertQuotationToOrder(req.user.tenant_id.toString(), req.params.id, req.user._id.toString());
  res.status(201).json(order);
}));

router.delete('/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  await Quotation.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  res.json({ message: 'Deleted' });
}));

export default router;

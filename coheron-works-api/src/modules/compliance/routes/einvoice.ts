import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { EInvoiceService } from '../../../services/compliance/EInvoiceService.js';

const router = Router();

router.post('/generate/:invoiceId', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const result = await EInvoiceService.generateIRN(tenantId, req.params.invoiceId);
  res.json(result);
}));

router.post('/cancel/:invoiceId', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const { reason } = req.body;
  const result = await EInvoiceService.cancelIRN(tenantId, req.params.invoiceId, reason || 'Cancelled');
  res.json(result);
}));

export default router;

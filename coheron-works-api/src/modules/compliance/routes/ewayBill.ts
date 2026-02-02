import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { EWayBillService } from '../../../services/compliance/EWayBillService.js';

const router = Router();

router.post('/generate/:deliveryId', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const result = await EWayBillService.generateEWayBill(tenantId, req.params.deliveryId);
  res.json(result);
}));

router.post('/cancel', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const { eway_bill_no, reason } = req.body;
  const result = await EWayBillService.cancelEWayBill(tenantId, eway_bill_no, reason);
  res.json(result);
}));

router.post('/extend', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const { eway_bill_no, vehicle_no, reason } = req.body;
  const result = await EWayBillService.extendValidity(tenantId, eway_bill_no, vehicle_no, reason);
  res.json(result);
}));

export default router;

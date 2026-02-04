import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import bankReconciliationService from '../../../services/bankReconciliationService.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = Router();

router.post('/import', authenticate, asyncHandler(async (req: any, res: any) => {
  const { bank_account_id, lines } = req.body;
  const result = await bankReconciliationService.importBankStatement(req.user.tenant_id.toString(), bank_account_id, lines);
  res.json(result);
}));

router.post('/auto-match', authenticate, asyncHandler(async (req: any, res: any) => {
  const { bank_account_id } = req.body;
  const result = await bankReconciliationService.autoMatch(req.user.tenant_id.toString(), bank_account_id);
  res.json(result);
}));

router.post('/reconcile', authenticate, asyncHandler(async (req: any, res: any) => {
  const { line_id, journal_entry_id } = req.body;
  await bankReconciliationService.reconcileLine(req.user.tenant_id.toString(), line_id, journal_entry_id);
  res.json({ message: 'Reconciled' });
}));

export default router;

import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import Partner from '../../../shared/models/Partner.js';
import Product from '../../../shared/models/Product.js';
import AccountAccount from '../../../models/AccountAccount.js';
import { Employee } from '../../../models/Employee.js';
import AccountMove from '../../../models/AccountMove.js';

const router = express.Router();

const importSchema = z.object({
  entity_type: z.enum(['chart_of_accounts', 'partners', 'products', 'employees', 'opening_balances']),
  data: z.array(z.record(z.any())).min(1, 'Data array must not be empty'),
});

const ENTITY_MODEL_MAP: Record<string, any> = {
  chart_of_accounts: AccountAccount,
  partners: Partner,
  products: Product,
  employees: Employee,
  opening_balances: AccountMove,
};

router.post(
  '/',
  asyncHandler(async (req: any, res: express.Response) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { entity_type, data } = parsed.data;
    const Model = ENTITY_MODEL_MAP[entity_type];

    if (!Model) {
      return res.status(400).json({ error: `Unsupported entity type: ${entity_type}` });
    }

    const tenantId = req.user?.tenant_id;
    let imported = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const doc: Record<string, any> = { ...data[i] };
        if (tenantId) {
          doc.tenant_id = tenantId;
        }
        await Model.create(doc);
        imported++;
      } catch (err: any) {
        errors.push({
          row: i + 2, // +2 because row 1 is header, data is 0-indexed
          message: err.message || 'Unknown error',
        });
      }
    }

    res.json({ imported, errors });
  }),
);

export default router;

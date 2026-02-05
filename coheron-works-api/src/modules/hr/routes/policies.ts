import express from 'express';
import { Policy } from '../../../models/Policy.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get policies
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { category, is_active } = req.query;
  const filter: any = {};

  if (category) {
    filter.category = category;
  }
  if (is_active !== undefined) {
    filter.is_active = is_active === 'true';
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Policy.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    Policy
  );
  res.json(result);
}));

// Create policy
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, category, body } = req.body;

  const policy = await Policy.create({ name, category, body });

  res.status(201).json(policy);
}));

export default router;

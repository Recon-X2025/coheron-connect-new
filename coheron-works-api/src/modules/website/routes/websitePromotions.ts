import express from 'express';
import { WebsitePromotion } from '../../../models/WebsitePromotion.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get all promotions
router.get('/', asyncHandler(async (req, res) => {
  const { site_id, is_active, code } = req.query;
  const filter: any = {};

  if (site_id) filter.site_id = site_id;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (code) filter.code = code;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WebsitePromotion.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, WebsitePromotion
  );

  res.json(paginatedResult);
}));

// Get promotion by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const promotion = await WebsitePromotion.findById(req.params.id).lean();
  if (!promotion) {
    return res.status(404).json({ error: 'Promotion not found' });
  }
  res.json(promotion);
}));

// Create promotion
router.post('/', asyncHandler(async (req, res) => {
  const { name, code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, valid_from, valid_until, usage_limit, usage_limit_per_customer, is_active, applicable_products, applicable_categories, site_id } = req.body;

  const promotion = await WebsitePromotion.create({
    name,
    code,
    description,
    discount_type,
    discount_value,
    min_purchase_amount: min_purchase_amount || 0,
    max_discount_amount,
    valid_from,
    valid_until,
    usage_limit,
    usage_limit_per_customer: usage_limit_per_customer || 1,
    is_active: is_active !== false,
    applicable_products: applicable_products || null,
    applicable_categories: applicable_categories || null,
    site_id,
  });

  res.status(201).json(promotion);
}));

// Update promotion
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, valid_from, valid_until, usage_limit, usage_limit_per_customer, is_active, applicable_products, applicable_categories } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (discount_type !== undefined) updateData.discount_type = discount_type;
  if (discount_value !== undefined) updateData.discount_value = discount_value;
  if (min_purchase_amount !== undefined) updateData.min_purchase_amount = min_purchase_amount;
  if (max_discount_amount !== undefined) updateData.max_discount_amount = max_discount_amount;
  if (valid_from !== undefined) updateData.valid_from = valid_from;
  if (valid_until !== undefined) updateData.valid_until = valid_until;
  if (usage_limit !== undefined) updateData.usage_limit = usage_limit;
  if (usage_limit_per_customer !== undefined) updateData.usage_limit_per_customer = usage_limit_per_customer;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (applicable_products !== undefined) updateData.applicable_products = applicable_products;
  if (applicable_categories !== undefined) updateData.applicable_categories = applicable_categories;

  const result = await WebsitePromotion.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Promotion not found' });
  }

  res.json(result);
}));

// Delete promotion
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await WebsitePromotion.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Promotion not found' });
  }
  res.json({ message: 'Promotion deleted successfully' });
}));

export default router;

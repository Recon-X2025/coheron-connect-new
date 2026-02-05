import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { PriceList, ProductPrice, CustomerPrice, PricingRule, DiscountApprovalRule, PromotionalPricing } from '../../../models/SalesPricing.js';
import { Product } from '../../../shared/models/Product.js';

const router = express.Router();

// ============================================
// PRICE LISTS
// ============================================

// Get all price lists
router.get('/price-lists', asyncHandler(async (req, res) => {
  const { is_active, currency } = req.query;
  const filter: any = {};

  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (currency) filter.currency = currency;

  const params = getPaginationParams(req);
  const result = await paginateQuery(PriceList.find(filter).sort({ created_at: -1 }).lean(), params, filter, PriceList);
  res.json(result);
}));

// Get price list by ID
router.get('/price-lists/:id', asyncHandler(async (req, res) => {
  const priceList = await PriceList.findById(req.params.id).lean();

  if (!priceList) {
    return res.status(404).json({ error: 'Price list not found' });
  }

  const products = await ProductPrice.find({ price_list_id: req.params.id })
    .populate('product_id', 'name')
    .sort({ 'product_id.name': 1 })
    .lean();

  const productsResult = products.map((p: any) => ({
    ...p,
    product_name: p.product_id?.name,
  }));

  res.json({ ...priceList, products: productsResult });
}));

// Create price list
router.post('/price-lists', asyncHandler(async (req, res) => {
  const { name, currency, is_active, valid_from, valid_until, is_default, products } = req.body;

  if (is_default) {
    await PriceList.updateMany({ is_default: true }, { is_default: false });
  }

  const priceList = await PriceList.create({
    name,
    currency: currency || 'INR',
    is_active: is_active !== false,
    valid_from,
    valid_until,
    is_default: is_default || false,
  });

  if (products && products.length > 0) {
    for (const product of products) {
      await ProductPrice.create({
        price_list_id: priceList._id,
        product_id: product.product_id,
        price: product.price,
        min_quantity: product.min_quantity || 1,
        valid_from: product.valid_from || valid_from,
        valid_until: product.valid_until || valid_until,
      });
    }
  }

  res.status(201).json(priceList);
}));

// Update price list
router.put('/price-lists/:id', asyncHandler(async (req, res) => {
  const { name, currency, is_active, valid_from, valid_until, is_default } = req.body;

  if (is_default) {
    await PriceList.updateMany({ is_default: true, _id: { $ne: req.params.id } }, { is_default: false });
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (currency !== undefined) updateData.currency = currency;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (valid_from !== undefined) updateData.valid_from = valid_from;
  if (valid_until !== undefined) updateData.valid_until = valid_until;
  if (is_default !== undefined) updateData.is_default = is_default;

  const priceList = await PriceList.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

  if (!priceList) {
    return res.status(404).json({ error: 'Price list not found' });
  }

  res.json(priceList);
}));

// Add/Update product price in price list
router.post('/price-lists/:id/products', asyncHandler(async (req, res) => {
  const { product_id, price, min_quantity, valid_from, valid_until } = req.body;

  const productPrice = await ProductPrice.findOneAndUpdate(
    { price_list_id: req.params.id, product_id, min_quantity: min_quantity || 1 },
    {
      price_list_id: req.params.id,
      product_id,
      price,
      min_quantity: min_quantity || 1,
      valid_from,
      valid_until,
    },
    { upsert: true, new: true }
  ).lean();

  res.status(201).json(productPrice);
}));

// ============================================
// CUSTOMER-SPECIFIC PRICING
// ============================================

// Get customer prices
router.get('/customer-prices/:partnerId', asyncHandler(async (req, res) => {
  const prices = await CustomerPrice.find({ partner_id: req.params.partnerId })
    .populate('product_id', 'name')
    .lean();

  const result = prices.map((p: any) => ({
    ...p,
    product_name: p.product_id?.name,
  }));

  res.json(result);
}));

// Set customer price
router.post('/customer-prices', asyncHandler(async (req, res) => {
  const { partner_id, product_id, price, valid_from, valid_until } = req.body;

  const customerPrice = await CustomerPrice.findOneAndUpdate(
    { partner_id, product_id },
    { partner_id, product_id, price, valid_from, valid_until },
    { upsert: true, new: true }
  ).lean();

  res.status(201).json(customerPrice);
}));

// ============================================
// PRICING RULES
// ============================================

// Get all pricing rules
router.get('/pricing-rules', asyncHandler(async (req, res) => {
  const { is_active, rule_type } = req.query;
  const filter: any = {};

  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (rule_type) filter.rule_type = rule_type;

  const params = getPaginationParams(req);
  const result = await paginateQuery(PricingRule.find(filter).sort({ priority: 1, created_at: -1 }).lean(), params, filter, PricingRule);
  res.json(result);
}));

// Create pricing rule
router.post('/pricing-rules', asyncHandler(async (req, res) => {
  const {
    name, rule_type, conditions, discount_type, discount_value,
    formula, priority, is_active, valid_from, valid_until,
  } = req.body;

  const rule = await PricingRule.create({
    name,
    rule_type,
    conditions,
    discount_type,
    discount_value,
    formula,
    priority: priority || 10,
    is_active: is_active !== false,
    valid_from,
    valid_until,
  });

  res.status(201).json(rule);
}));

// Calculate price for product (applies all rules)
router.post('/calculate-price', asyncHandler(async (req, res) => {
  const { product_id, partner_id, quantity, price_list_id } = req.body;

  let basePrice = 0;

  // Try customer-specific price first
  if (partner_id) {
    const customerPrice = await CustomerPrice.findOne({
      partner_id,
      product_id,
      $or: [{ valid_until: null }, { valid_until: { $gte: new Date() } }],
    }).lean() as any;
    if (customerPrice) {
      basePrice = customerPrice.price || 0;
    }
  }

  // If no customer price, get from price list
  if (basePrice === 0 && price_list_id) {
    const priceListPrice = await ProductPrice.findOne({
      price_list_id,
      product_id,
      min_quantity: { $lte: quantity || 1 },
    }).sort({ min_quantity: -1 }).lean() as any;
    if (priceListPrice) {
      basePrice = priceListPrice.price || 0;
    }
  }

  // If still no price, get standard price
  if (basePrice === 0) {
    const product = await Product.findById(product_id).lean();
    if (product) {
      basePrice = (product as any).list_price || 0;
    }
  }

  // Apply pricing rules
  const rules = await PricingRule.find({
    is_active: true,
    $or: [{ valid_from: null }, { valid_from: { $lte: new Date() } }],
  }).find({
    $or: [{ valid_until: null }, { valid_until: { $gte: new Date() } }],
  }).sort({ priority: 1 }).lean();

  let finalPrice = basePrice;
  let appliedRules: any[] = [];

  for (const rule of rules) {
    const conditions = rule.conditions as any;
    let matches = true;

    if (conditions) {
      if (conditions.min_quantity && quantity < conditions.min_quantity) matches = false;
      if (conditions.max_quantity && quantity > conditions.max_quantity) matches = false;
    }

    if (matches) {
      if (rule.discount_type === 'percentage') {
        finalPrice = finalPrice * (1 - ((rule.discount_value || 0) / 100));
      } else if (rule.discount_type === 'fixed') {
        finalPrice = finalPrice - (rule.discount_value || 0);
      }
      appliedRules.push({ rule_id: rule._id, rule_name: rule.name });
    }
  }

  res.json({
    base_price: basePrice,
    final_price: Math.max(0, finalPrice),
    quantity: quantity || 1,
    total: Math.max(0, finalPrice) * (quantity || 1),
    applied_rules: appliedRules,
  });
}));

// ============================================
// DISCOUNT APPROVAL RULES
// ============================================

// Get discount approval rules
router.get('/discount-approval-rules', asyncHandler(async (req, res) => {
  const filter: any = { is_active: true };

  const params = getPaginationParams(req);
  const result = await paginateQuery(DiscountApprovalRule.find(filter).sort({ created_at: -1 }).lean(), params, filter, DiscountApprovalRule);
  res.json(result);
}));

// Check if discount requires approval
router.post('/check-discount-approval', asyncHandler(async (req, res) => {
  const { discount_percentage, discount_amount, order_total } = req.body;

  const rule = await DiscountApprovalRule.findOne({ is_active: true }).sort({ created_at: -1 }).lean() as any;

  if (!rule) {
    return res.json({ requires_approval: false });
  }

  let requiresApproval = false;

  if (rule.max_discount_percentage && discount_percentage > rule.max_discount_percentage) {
    requiresApproval = true;
  }

  if (rule.max_discount_amount && discount_amount > rule.max_discount_amount) {
    requiresApproval = true;
  }

  res.json({
    requires_approval: requiresApproval,
    approver_id: rule.approver_id,
    approval_workflow: rule.approval_workflow,
  });
}));

// ============================================
// PROMOTIONAL PRICING
// ============================================

// Get active promotions
router.get('/promotions', asyncHandler(async (req, res) => {
  const { product_id } = req.query;
  const filter: any = {
    is_active: true,
    valid_from: { $lte: new Date() },
    valid_until: { $gte: new Date() },
  };

  if (product_id) {
    filter.product_ids = product_id;
  }

  const params = getPaginationParams(req);
  const result = await paginateQuery(PromotionalPricing.find(filter).sort({ created_at: -1 }).lean(), params, filter, PromotionalPricing);
  res.json(result);
}));

// Create promotion
router.post('/promotions', asyncHandler(async (req, res) => {
  const { name, campaign_name, product_ids, discount_type, discount_value, buy_x_get_y_config, valid_from, valid_until } = req.body;

  const promotion = await PromotionalPricing.create({
    name,
    campaign_name,
    product_ids,
    discount_type,
    discount_value,
    buy_x_get_y_config,
    valid_from,
    valid_until,
  });

  res.status(201).json(promotion);
}));

export default router;

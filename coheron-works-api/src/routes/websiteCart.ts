import express from 'express';
import { WebsiteCart, WebsiteCartItem } from '../models/WebsiteCart.js';
import { WebsitePromotion } from '../models/WebsitePromotion.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Get or create cart
router.get('/', asyncHandler(async (req, res) => {
  const { session_id, customer_id, site_id } = req.query;

  let cart: any = null;
  if (customer_id) {
    cart = await WebsiteCart.findOne({ customer_id, site_id }).sort({ created_at: -1 }).lean();
  } else if (session_id) {
    cart = await WebsiteCart.findOne({ session_id, site_id }).sort({ created_at: -1 }).lean();
  }

  if (!cart) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newCart = await WebsiteCart.create({
      session_id: session_id || null,
      customer_id: customer_id || null,
      site_id,
      currency: 'USD',
      expires_at: expiresAt,
    });
    cart = newCart.toObject();
  }

  const items = await WebsiteCartItem.find({ cart_id: cart._id })
    .populate('product_id', 'name image_url')
    .populate('website_product_id', 'is_published')
    .lean();

  const itemsResult = items.map((i: any) => ({
    ...i,
    id: i._id,
    product_name: i.product_id?.name,
    image_url: i.product_id?.image_url,
    is_published: i.website_product_id?.is_published,
  }));

  res.json({ ...cart, id: cart._id, items: itemsResult });
}));

// Add item to cart
router.post('/items', asyncHandler(async (req, res) => {
  const { cart_id, product_id, website_product_id, variant_id, quantity } = req.body;

  const product = await Product.findById(product_id).lean();
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const unit_price = product.list_price;

  const existingFilter: any = { cart_id, product_id };
  if (variant_id) existingFilter.variant_id = variant_id;
  const existing = await WebsiteCartItem.findOne(existingFilter);

  let item;
  if (existing) {
    const newQuantity = existing.quantity + (quantity || 1);
    item = await WebsiteCartItem.findByIdAndUpdate(
      existing._id,
      { quantity: newQuantity, subtotal: newQuantity * unit_price },
      { new: true }
    );
  } else {
    const qty = quantity || 1;
    item = await WebsiteCartItem.create({
      cart_id,
      product_id,
      website_product_id,
      variant_id,
      quantity: qty,
      unit_price,
      subtotal: qty * unit_price,
    });
  }

  await recalculateCartTotals(cart_id);
  res.json(item);
}));

// Update cart item
router.put('/items/:id', asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const existing = await WebsiteCartItem.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  const result = await WebsiteCartItem.findByIdAndUpdate(
    req.params.id,
    { quantity, subtotal: quantity * existing.unit_price },
    { new: true }
  );

  await recalculateCartTotals(existing.cart_id);
  res.json(result);
}));

// Remove item from cart
router.delete('/items/:id', asyncHandler(async (req, res) => {
  const item = await WebsiteCartItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  await WebsiteCartItem.findByIdAndDelete(req.params.id);
  await recalculateCartTotals(item.cart_id);

  res.json({ message: 'Item removed from cart' });
}));

// Apply promotion code
router.post('/apply-promotion', asyncHandler(async (req, res) => {
  const { cart_id, promotion_code } = req.body;

  const now = new Date();
  const promotion = await WebsitePromotion.findOne({
    code: promotion_code,
    is_active: true,
    valid_from: { $lte: now },
    valid_until: { $gte: now },
  }).lean();

  if (!promotion) {
    return res.status(400).json({ error: 'Invalid or expired promotion code' });
  }

  const cart = await WebsiteCart.findById(cart_id).lean();
  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  if (cart.subtotal < promotion.min_purchase_amount) {
    return res.status(400).json({
      error: `Minimum purchase amount of ${promotion.min_purchase_amount} required`,
    });
  }

  let discount = 0;
  if (promotion.discount_type === 'percentage') {
    discount = (cart.subtotal * promotion.discount_value) / 100;
  } else if (promotion.discount_type === 'fixed') {
    discount = promotion.discount_value;
  }

  if (promotion.max_discount_amount && discount > promotion.max_discount_amount) {
    discount = promotion.max_discount_amount;
  }

  await WebsiteCart.findByIdAndUpdate(cart_id, {
    promotion_code,
    discount_amount: discount,
    total: cart.subtotal + cart.tax_amount + (cart.shipping_amount || 0) - discount,
  });

  res.json({ message: 'Promotion applied', discount });
}));

// Helper function to recalculate cart totals
async function recalculateCartTotals(cartId: any) {
  const items = await WebsiteCartItem.find({ cart_id: cartId });
  const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const cart = await WebsiteCart.findById(cartId);
  if (!cart) return;

  const taxAmount = subtotal * 0.1; // 10% tax example
  const total = subtotal + taxAmount + (cart.shipping_amount || 0) - (cart.discount_amount || 0);

  await WebsiteCart.findByIdAndUpdate(cartId, { subtotal, tax_amount: taxAmount, total });
}

export default router;

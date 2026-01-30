import express from 'express';
import Product from '../models/Product.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get all products
router.get('/', asyncHandler(async (req, res) => {
  const { search, type } = req.query;
  const filter: any = {};

  if (type) filter.type = type;
  if (search) filter.name = { $regex: search as string, $options: 'i' };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Product.find(filter).sort({ name: 1 }).lean(),
    pagination,
    filter,
    Product
  );
  res.json(result);
}));

// Get product by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

// Create product
router.post('/', asyncHandler(async (req, res) => {
  const { name, default_code, list_price, standard_price, qty_available, type, categ_id, image_url } = req.body;
  const product = await Product.create({
    name, default_code,
    list_price: list_price || 0,
    standard_price: standard_price || 0,
    qty_available: qty_available || 0,
    type: type || 'product',
    categ_id, image_url,
  });
  res.status(201).json(product);
}));

// Update product
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, default_code, list_price, standard_price, qty_available, type, categ_id, image_url } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, default_code, list_price, standard_price, qty_available, type, categ_id, image_url },
    { new: true }
  );
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

// Delete product
router.delete('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted successfully' });
}));

// Get stock by warehouse
router.get('/:id/stock', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('stock name sku').lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

// Manage suppliers
router.post('/:id/suppliers', asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $push: { suppliers: req.body } },
    { new: true }
  );
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

router.delete('/:id/suppliers/:supplierId', asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $pull: { suppliers: { _id: req.params.supplierId } } },
    { new: true }
  );
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

export default router;

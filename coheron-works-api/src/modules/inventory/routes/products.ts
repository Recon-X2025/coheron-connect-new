import express from 'express';
import Product from '../../../shared/models/Product.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { validate } from '../../../shared/middleware/validate.js';
import { authenticate, checkRecordAccess } from '../../../shared/middleware/permissions.js';
import { objectIdParam } from '../../../shared/schemas/common.js';
import { createProductSchema, updateProductSchema, addSupplierSchema } from '../schemas.js';

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with pagination
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [product, service, consumable] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated list of products
 */
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
router.get('/:id', authenticate, checkRecordAccess('products'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, ...req.recordFilter }).lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               default_code: { type: string }
 *               list_price: { type: number }
 *               standard_price: { type: number }
 *               qty_available: { type: number }
 *               type: { type: string, enum: [product, service, consumable] }
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', validate({ body: createProductSchema }), asyncHandler(async (req, res) => {
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
router.put('/:id', validate({ params: objectIdParam, body: updateProductSchema }), authenticate, checkRecordAccess('products'), asyncHandler(async (req, res) => {
  const { name, default_code, list_price, standard_price, qty_available, type, categ_id, image_url } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, ...req.recordFilter },
    { name, default_code, list_price, standard_price, qty_available, type, categ_id, image_url },
    { new: true }
  );
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));

// Delete product
router.delete('/:id', authenticate, checkRecordAccess('products'), asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, ...req.recordFilter });
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
router.post('/:id/suppliers', validate({ params: objectIdParam, body: addSupplierSchema }), asyncHandler(async (req, res) => {
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

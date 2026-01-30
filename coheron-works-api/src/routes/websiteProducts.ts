import express from 'express';
import { WebsiteProduct, WebsiteProductVariant, WebsiteCategory, WebsiteProductCategory } from '../models/WebsiteProduct.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get all website products
router.get('/', asyncHandler(async (req, res) => {
  const { site_id, is_published, category_id, search } = req.query;
  const filter: any = {};

  if (site_id) filter.site_id = site_id;
  if (is_published !== undefined) filter.is_published = is_published === 'true';

  if (category_id) {
    const productCategories = await WebsiteProductCategory.find({ category_id }).select('website_product_id');
    const productIds = productCategories.map((pc: any) => pc.website_product_id);
    filter._id = { $in: productIds };
  }

  let products = await WebsiteProduct.find(filter)
    .populate('product_id', 'name default_code list_price standard_price qty_available image_url')
    .sort({ display_order: 1, created_at: -1 })
    .lean();

  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    products = products.filter((p: any) =>
      searchRegex.test(p.product_id?.name) || searchRegex.test(p.short_description)
    );
  }

  const result = products.map((wp: any) => ({
    ...wp,
    id: wp._id,
    product_name: wp.product_id?.name,
    default_code: wp.product_id?.default_code,
    list_price: wp.product_id?.list_price,
    standard_price: wp.product_id?.standard_price,
    qty_available: wp.product_id?.qty_available,
    image_url: wp.product_id?.image_url,
  }));

  res.json(result);
}));

// Get product by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await WebsiteProduct.findById(req.params.id)
    .populate('product_id', 'name default_code list_price standard_price qty_available image_url type categ_id')
    .lean();

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const [variants, productCategories] = await Promise.all([
    WebsiteProductVariant.find({ website_product_id: req.params.id }).lean(),
    WebsiteProductCategory.find({ website_product_id: req.params.id }).select('category_id').lean(),
  ]);

  const categoryIds = productCategories.map((pc: any) => pc.category_id);
  const categories = await WebsiteCategory.find({ _id: { $in: categoryIds } }).lean();

  const wp: any = product;
  res.json({
    ...wp,
    id: wp._id,
    product_name: wp.product_id?.name,
    default_code: wp.product_id?.default_code,
    list_price: wp.product_id?.list_price,
    standard_price: wp.product_id?.standard_price,
    qty_available: wp.product_id?.qty_available,
    image_url: wp.product_id?.image_url,
    type: wp.product_id?.type,
    categ_id: wp.product_id?.categ_id,
    variants,
    categories,
  });
}));

// Sync product from ERP
router.post('/sync', asyncHandler(async (req, res) => {
  const { product_id, site_id } = req.body;

  const product = await Product.findById(product_id).lean();
  if (!product) {
    return res.status(404).json({ error: 'Product not found in ERP' });
  }

  let websiteProduct = await WebsiteProduct.findOne({ product_id, site_id });

  if (websiteProduct) {
    websiteProduct = await WebsiteProduct.findOneAndUpdate(
      { product_id, site_id },
      { sync_status: 'synced', last_synced_at: new Date() },
      { new: true }
    );
  } else {
    websiteProduct = await WebsiteProduct.create({
      product_id,
      site_id,
      sync_status: 'synced',
      last_synced_at: new Date(),
    });
  }

  res.json(websiteProduct);
}));

// Update website product
router.put('/:id', asyncHandler(async (req, res) => {
  const { is_published, is_featured, display_order, short_description, long_description, seo_title, seo_description, seo_keywords } = req.body;

  const updateData: any = {};
  if (is_published !== undefined) updateData.is_published = is_published;
  if (is_featured !== undefined) updateData.is_featured = is_featured;
  if (display_order !== undefined) updateData.display_order = display_order;
  if (short_description !== undefined) updateData.short_description = short_description;
  if (long_description !== undefined) updateData.long_description = long_description;
  if (seo_title !== undefined) updateData.seo_title = seo_title;
  if (seo_description !== undefined) updateData.seo_description = seo_description;
  if (seo_keywords !== undefined) updateData.seo_keywords = seo_keywords;

  const result = await WebsiteProduct.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(result);
}));

export default router;

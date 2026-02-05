import express from 'express';
import Partner from '../../../shared/models/Partner.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get all partners
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { search, type } = req.query;
  const filter: any = {};

  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
      { email: { $regex: search as string, $options: 'i' } }
    ];
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Partner.find(filter).sort({ name: 1 }).lean(),
    pagination,
    filter,
    Partner
  );
  res.json(result);
}));

// Get partner by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id).lean();
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json(partner);
}));

// Create partner
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, email, phone, company, type, image_url } = req.body;
  const partner = await Partner.create({ name, email, phone, company, type: type || 'contact', image_url });
  res.status(201).json(partner);
}));

// Update partner
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, email, phone, company, type, image_url } = req.body;
  const partner = await Partner.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, company, type, image_url },
    { new: true }
  );
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json(partner);
}));

// Delete partner
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const partner = await Partner.findByIdAndDelete(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json({ message: 'Partner deleted successfully' });
}));

export default router;

import express from 'express';
import { GSTReturn } from '../../../models/GSTReturn.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { return_type, status, financial_year } = req.query;
  const filter: any = {};
  if (return_type) filter.return_type = return_type;
  if (status) filter.status = status;
  if (financial_year) filter.financial_year = financial_year;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    GSTReturn.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, GSTReturn
  );
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const entry = await GSTReturn.findById(req.params.id).lean();
  if (!entry) return res.status(404).json({ error: 'GST return not found' });
  res.json(entry);
}));

router.post('/', asyncHandler(async (req, res) => {
  const entry = await GSTReturn.create(req.body);
  res.status(201).json(entry);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const entry = await GSTReturn.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!entry) return res.status(404).json({ error: 'GST return not found' });
  res.json(entry);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const entry = await GSTReturn.findByIdAndDelete(req.params.id);
  if (!entry) return res.status(404).json({ error: 'GST return not found' });
  res.json({ message: 'GST return deleted successfully' });
}));

export default router;

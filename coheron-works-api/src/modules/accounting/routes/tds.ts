import express from 'express';
import { TDSEntry } from '../../../models/TDS.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status, quarter, financial_year, section } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (quarter) filter.quarter = quarter;
  if (financial_year) filter.financial_year = financial_year;
  if (section) filter.section = section;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    TDSEntry.find(filter).sort({ payment_date: -1 }).lean(),
    pagination, filter, TDSEntry
  );
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const entry = await TDSEntry.findById(req.params.id).lean();
  if (!entry) return res.status(404).json({ error: 'TDS entry not found' });
  res.json(entry);
}));

router.post('/', asyncHandler(async (req, res) => {
  const entry = await TDSEntry.create(req.body);
  res.status(201).json(entry);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const entry = await TDSEntry.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!entry) return res.status(404).json({ error: 'TDS entry not found' });
  res.json(entry);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const entry = await TDSEntry.findByIdAndDelete(req.params.id);
  if (!entry) return res.status(404).json({ error: 'TDS entry not found' });
  res.json({ message: 'TDS entry deleted successfully' });
}));

export default router;

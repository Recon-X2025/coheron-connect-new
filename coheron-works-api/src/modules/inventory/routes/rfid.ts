import express from 'express';
import { RFIDTag } from '../../../models/RFIDTag.js';
import { RFIDReader } from '../../../models/RFIDReader.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// GET /tags
router.get('/tags', authenticate, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, status, associated_type } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (status) filter.status = status;
  if (associated_type) filter.associated_type = associated_type;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(RFIDTag.find(filter).sort({ last_read_at: -1 }).lean(), pagination, filter, RFIDTag);
  res.json(result);
}));

// POST /tags
router.post('/tags', authenticate, asyncHandler(async (req: any, res: any) => {
  const tag = await RFIDTag.create(req.body);
  res.status(201).json(tag);
}));

// PUT /tags/:id
router.put('/tags/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const tag = await RFIDTag.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!tag) return res.status(404).json({ error: 'Tag not found' });
  res.json(tag);
}));

// POST /tags/:id/deactivate
router.post('/tags/:id/deactivate', authenticate, asyncHandler(async (req: any, res: any) => {
  const tag = await RFIDTag.findByIdAndUpdate(req.params.id, { status: 'deactivated' }, { new: true }).lean();
  if (!tag) return res.status(404).json({ error: 'Tag not found' });
  res.json(tag);
}));

// POST /read
router.post('/read', authenticate, asyncHandler(async (req: any, res: any) => {
  const { epc, reader_id, tenant_id, location } = req.body;
  const tag = await RFIDTag.findOne({ tenant_id, epc });
  if (!tag) return res.status(404).json({ error: 'Tag not recognized' });
  const reader = await RFIDReader.findOne({ tenant_id, reader_id }).lean();
  tag.last_read_at = new Date();
  tag.last_read_location = location || reader?.location_description || '';
  tag.last_reader_id = reader?._id as any;
  tag.read_count = (tag.read_count || 0) + 1;
  await tag.save();
  let stock_move = null;
  if (reader?.reader_type === 'portal') {
    stock_move = { type: 'rfid_portal_read', tag_epc: epc, associated_type: tag.associated_type, associated_id: tag.associated_id, reader_location: reader.location_description, warehouse_id: reader.warehouse_id, timestamp: new Date() };
  }
  res.json({ tag, reader, stock_move });
}));

// POST /bulk-read
router.post('/bulk-read', authenticate, asyncHandler(async (req: any, res: any) => {
  const { reads, tenant_id } = req.body;
  const results: any[] = [];
  const notFound: string[] = [];
  for (const read of (reads || [])) {
    const tag = await RFIDTag.findOne({ tenant_id, epc: read.epc });
    if (!tag) { notFound.push(read.epc); continue; }
    tag.last_read_at = new Date();
    tag.read_count = (tag.read_count || 0) + 1;
    if (read.reader_id) {
      const reader = await RFIDReader.findOne({ tenant_id, reader_id: read.reader_id }).lean();
      if (reader) { tag.last_reader_id = reader._id as any; tag.last_read_location = reader.location_description || ''; }
    }
    await tag.save();
    results.push({ epc: read.epc, associated_type: tag.associated_type, associated_id: tag.associated_id, status: tag.status });
  }
  res.json({ processed: results.length, not_found: notFound, results });
}));

// GET /readers
router.get('/readers', authenticate, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, is_active, reader_type } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (reader_type) filter.reader_type = reader_type;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(RFIDReader.find(filter).sort({ name: 1 }).lean(), pagination, filter, RFIDReader);
  res.json(result);
}));

// POST /readers
router.post('/readers', authenticate, asyncHandler(async (req: any, res: any) => {
  const reader = await RFIDReader.create(req.body); res.status(201).json(reader);
}));

// PUT /readers/:id
router.put('/readers/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const reader = await RFIDReader.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!reader) return res.status(404).json({ error: 'Reader not found' });
  res.json(reader);
}));

// GET /readers/:id/reads
router.get('/readers/:id/reads', authenticate, asyncHandler(async (req: any, res: any) => {
  const reader = await RFIDReader.findById(req.params.id).lean();
  if (!reader) return res.status(404).json({ error: 'Reader not found' });
  const tags = await RFIDTag.find({ tenant_id: reader.tenant_id, last_reader_id: reader._id }).sort({ last_read_at: -1 }).limit(100).lean();
  res.json({ reader, recent_reads: tags });
}));

export default router;

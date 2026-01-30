import express from 'express';
import { CustomField, CustomFieldValue } from '../models/CustomField.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// --- Field Definitions ---
router.get('/', asyncHandler(async (req, res) => {
  const { module, entity } = req.query;
  const filter: any = {};
  if (module) filter.module = module;
  if (entity) filter.entity = entity;
  const fields = await CustomField.find(filter).sort({ display_order: 1 }).lean();
  res.json(fields);
}));

router.post('/', asyncHandler(async (req, res) => {
  const field = await CustomField.create(req.body);
  res.status(201).json(field);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const field = await CustomField.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!field) return res.status(404).json({ error: 'Custom field not found' });
  res.json(field);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const field = await CustomField.findByIdAndDelete(req.params.id);
  if (!field) return res.status(404).json({ error: 'Custom field not found' });
  await CustomFieldValue.deleteMany({ field_id: req.params.id });
  res.json({ message: 'Custom field deleted successfully' });
}));

// --- Field Values ---
router.get('/values/:entityType/:entityId', asyncHandler(async (req, res) => {
  const values = await CustomFieldValue.find({
    entity_type: req.params.entityType,
    entity_id: req.params.entityId,
  }).populate('field_id').lean();
  res.json(values);
}));

router.put('/values/:entityType/:entityId', asyncHandler(async (req, res) => {
  const { values } = req.body;
  const results = await Promise.all(
    (values || []).map((v: any) =>
      CustomFieldValue.findOneAndUpdate(
        { field_id: v.field_id, entity_id: req.params.entityId, entity_type: req.params.entityType },
        { ...v, entity_id: req.params.entityId, entity_type: req.params.entityType },
        { new: true, upsert: true }
      )
    )
  );
  res.json(results);
}));

export default router;

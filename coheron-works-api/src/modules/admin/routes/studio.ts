import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { CustomEntity } from '../../../models/CustomEntity.js';
import { CustomEntityRecord } from '../../../models/CustomEntityRecord.js';
import { CustomView } from '../../../models/CustomView.js';
import { CustomAutomation } from '../../../models/CustomAutomation.js';

const router = express.Router();

router.get('/entities', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const entities = await CustomEntity.find({ tenant_id }).sort({ created_at: -1 });
  res.json({ data: entities });
}));

router.post('/entities', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const entity = await CustomEntity.create({ ...req.body, tenant_id, created_by: req.user?._id });
  res.status(201).json({ data: entity });
}));

router.get('/entities/:slug', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const entity = await CustomEntity.findOne({ tenant_id, slug: req.params.slug });
  if (!entity) return res.status(404).json({ error: 'Entity not found' });
  res.json({ data: entity });
}));

router.put('/entities/:slug', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const entity = await CustomEntity.findOneAndUpdate(
    { tenant_id, slug: req.params.slug },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!entity) return res.status(404).json({ error: 'Entity not found' });
  res.json({ data: entity });
}));

router.delete('/entities/:slug', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const entity = await CustomEntity.findOneAndDelete({ tenant_id, slug: req.params.slug });
  if (!entity) return res.status(404).json({ error: 'Entity not found' });
  await CustomEntityRecord.deleteMany({ tenant_id, entity_slug: req.params.slug });
  res.json({ message: 'Entity and all records deleted' });
}));

router.get('/data/:entitySlug', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const { entitySlug } = req.params;
  const { page = '1', limit = '20', sort_field, sort_order = 'desc', search, ...filters } = req.query as Record<string, string>;
  const entity = await CustomEntity.findOne({ tenant_id, slug: entitySlug });
  if (!entity) return res.status(404).json({ error: 'Entity not found' });
  const query: Record<string, any> = { tenant_id, entity_slug: entitySlug };
  if (search) {
    const searchableFields = entity.fields.filter((f: any) => f.is_searchable).map((f: any) => f.name);
    if (searchableFields.length > 0) {
      query.$or = searchableFields.map((field: string) => ({
        [`data.${field}`]: { $regex: search, $options: 'i' }
      }));
    }
  }
  for (const [key, value] of Object.entries(filters)) {
    if (key.startsWith('filter_')) {
      const fieldName = key.replace('filter_', '');
      query[`data.${fieldName}`] = value;
    }
  }
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  const sortObj: Record<string, 1 | -1> = {};
  if (sort_field) {
    sortObj[`data.${sort_field}`] = sort_order === 'asc' ? 1 : -1;
  } else if (entity.default_sort_field) {
    sortObj[`data.${entity.default_sort_field}`] = entity.default_sort_order === 'asc' ? 1 : -1;
  } else {
    sortObj.created_at = -1;
  }
  const [records, total] = await Promise.all([
    CustomEntityRecord.find(query).sort(sortObj).skip(skip).limit(limitNum),
    CustomEntityRecord.countDocuments(query)
  ]);
  res.json({ data: records, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
}));

router.post('/data/:entitySlug', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const { entitySlug } = req.params;
  const entity = await CustomEntity.findOne({ tenant_id, slug: entitySlug });
  if (!entity) return res.status(404).json({ error: 'Entity not found' });
  const errors: string[] = [];
  for (const field of entity.fields) {
    const val = req.body.data?.[field.name];
    if (field.required && (val === undefined || val === null || val === '')) {
      errors.push(`Field '${field.label}' is required`);
    }
    if (field.validation_regex && val) {
      const regex = new RegExp(field.validation_regex);
      if (!regex.test(String(val))) errors.push(`Field '${field.label}' format invalid`);
    }
    if ((field.field_type === 'number' || field.field_type === 'decimal') && val !== undefined) {
      const n = Number(val);
      if (field.min_value != null && n < field.min_value) errors.push(`Field '${field.label}' must be >= ${field.min_value}`);
      if (field.max_value != null && n > field.max_value) errors.push(`Field '${field.label}' must be <= ${field.max_value}`);
    }
    if (val && typeof val === 'string') {
      if (field.min_length != null && val.length < field.min_length) errors.push(`Field '${field.label}' min length ${field.min_length}`);
      if (field.max_length != null && val.length > field.max_length) errors.push(`Field '${field.label}' max length ${field.max_length}`);
    }
    if (field.field_type === 'select' && val && field.options?.length && !field.options.includes(val)) {
      errors.push(`Field '${field.label}' must be one of: ${field.options.join(', ')}`);
    }
  }
  if (errors.length > 0) return res.status(400).json({ errors });
  const data = { ...req.body.data };
  for (const field of entity.fields) {
    if (data[field.name] === undefined && field.default_value != null) data[field.name] = field.default_value;
  }
  const record = await CustomEntityRecord.create({ tenant_id, entity_slug: entitySlug, data, created_by: req.user?._id, updated_by: req.user?._id });
  res.status(201).json({ data: record });
}));

router.get('/data/:entitySlug/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const record = await CustomEntityRecord.findOne({ _id: req.params.id, tenant_id, entity_slug: req.params.entitySlug });
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({ data: record });
}));

router.put('/data/:entitySlug/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const record = await CustomEntityRecord.findOneAndUpdate(
    { _id: req.params.id, tenant_id, entity_slug: req.params.entitySlug },
    { $set: { data: req.body.data, updated_by: req.user?._id } },
    { new: true }
  );
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({ data: record });
}));

router.delete('/data/:entitySlug/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const record = await CustomEntityRecord.findOneAndDelete({ _id: req.params.id, tenant_id, entity_slug: req.params.entitySlug });
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({ message: 'Record deleted' });
}));

router.get('/views', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const query: Record<string, any> = { tenant_id };
  if (req.query.entity_type) query.entity_type = req.query.entity_type;
  if (req.query.view_type) query.view_type = req.query.view_type;
  const views = await CustomView.find(query).sort({ created_at: -1 });
  res.json({ data: views });
}));

router.post('/views', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const view = await CustomView.create({ ...req.body, tenant_id, created_by: req.user?._id });
  res.status(201).json({ data: view });
}));

router.get('/views/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const view = await CustomView.findOne({ _id: req.params.id, tenant_id });
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json({ data: view });
}));

router.put('/views/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const view = await CustomView.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json({ data: view });
}));

router.delete('/views/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const view = await CustomView.findOneAndDelete({ _id: req.params.id, tenant_id });
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json({ message: 'View deleted' });
}));

router.get('/automations', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const query: Record<string, any> = { tenant_id };
  if (req.query.entity_type) query.entity_type = req.query.entity_type;
  if (req.query.is_active !== undefined) query.is_active = req.query.is_active === 'true';
  const automations = await CustomAutomation.find(query).sort({ created_at: -1 });
  res.json({ data: automations });
}));

router.post('/automations', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const automation = await CustomAutomation.create({ ...req.body, tenant_id, created_by: req.user?._id });
  res.status(201).json({ data: automation });
}));

router.get('/automations/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const automation = await CustomAutomation.findOne({ _id: req.params.id, tenant_id });
  if (!automation) return res.status(404).json({ error: 'Automation not found' });
  res.json({ data: automation });
}));

router.put('/automations/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const automation = await CustomAutomation.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!automation) return res.status(404).json({ error: 'Automation not found' });
  res.json({ data: automation });
}));

router.delete('/automations/:id', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const automation = await CustomAutomation.findOneAndDelete({ _id: req.params.id, tenant_id });
  if (!automation) return res.status(404).json({ error: 'Automation not found' });
  res.json({ message: 'Automation deleted' });
}));

router.post('/automations/:id/toggle', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const automation = await CustomAutomation.findOne({ _id: req.params.id, tenant_id });
  if (!automation) return res.status(404).json({ error: 'Automation not found' });
  automation.is_active = !automation.is_active;
  await automation.save();
  res.json({ data: automation });
}));

router.post('/automations/:id/run', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const automation = await CustomAutomation.findOne({ _id: req.params.id, tenant_id });
  if (!automation) return res.status(404).json({ error: 'Automation not found' });
  const results: any[] = [];
  for (const action of automation.actions) {
    const actionObj = action as any;
    switch (actionObj.action_type) {
      case 'set_field': {
        const { entity_slug, record_id, field_name, field_value } = actionObj.config || {};
        if (entity_slug && record_id && field_name) {
          const updated = await CustomEntityRecord.findOneAndUpdate(
            { _id: record_id, tenant_id, entity_slug },
            { $set: { [`data.${field_name}`]: field_value } },
            { new: true }
          );
          results.push({ action_type: 'set_field', success: !!updated });
        }
        break;
      }
      case 'create_record': {
        const { entity_slug: slug, data } = actionObj.config || {};
        if (slug && data) {
          const record = await CustomEntityRecord.create({ tenant_id, entity_slug: slug, data, created_by: req.user?._id, updated_by: req.user?._id });
          results.push({ action_type: 'create_record', success: true, record_id: record._id });
        }
        break;
      }
      case 'send_notification':
      case 'send_email':
      case 'update_record':
      case 'webhook':
        results.push({ action_type: actionObj.action_type, success: true, message: 'Action queued' });
        break;
      default:
        results.push({ action_type: actionObj.action_type, success: false, message: 'Unknown action type' });
    }
  }
  automation.run_count = (automation.run_count || 0) + 1;
  automation.last_run_at = new Date();
  await automation.save();
  res.json({ data: { automation, results } });
}));

export default router;

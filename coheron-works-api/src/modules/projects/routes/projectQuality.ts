import express from 'express';
import QualityChecklist from '../../../models/QualityChecklist.js';
import ProjectInspection from '../../../models/ProjectInspection.js';
import ProjectCompliance from '../../../models/ProjectCompliance.js';
import ComplianceTemplate from '../../../models/ComplianceTemplate.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// QUALITY CHECKLISTS
// ============================================

router.get('/:projectId/quality-checklists', asyncHandler(async (req, res) => {
  const { status, checklist_type } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;
  if (checklist_type) filter.checklist_type = checklist_type;

  const checklists = await QualityChecklist.find(filter)
    .populate('completed_by', 'name')
    .populate('task_id', 'name')
    .sort({ created_at: -1 })
    .lean();

  const rows = checklists.map((qc: any) => {
    const obj: any = { ...qc };
    if (obj.completed_by) obj.completed_by_name = obj.completed_by.name;
    if (obj.task_id) obj.task_name = obj.task_id.name;
    return obj;
  });

  res.json(rows);
}));

router.post('/:projectId/quality-checklists', asyncHandler(async (req, res) => {
  const { task_id, checklist_name, checklist_type, items } = req.body;

  if (!checklist_name || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Checklist name and items are required' });
  }

  const checklist = await QualityChecklist.create({
    project_id: req.params.projectId,
    task_id,
    checklist_name,
    checklist_type: checklist_type || 'qa',
    items,
    status: 'draft',
  });

  res.status(201).json(checklist);
}));

router.put('/quality-checklists/:id', asyncHandler(async (req, res) => {
  const { items, status, completed_by } = req.body;
  const updateData: any = {};

  if (items) updateData.items = items;
  if (status) updateData.status = status;
  if (completed_by) updateData.completed_by = completed_by;
  if (status === 'completed' && completed_by) {
    updateData.completed_at = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const checklist = await QualityChecklist.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
  res.json(checklist);
}));

// ============================================
// INSPECTION REPORTS
// ============================================

router.get('/:projectId/inspections', asyncHandler(async (req, res) => {
  const { status, inspection_type } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;
  if (inspection_type) filter.inspection_type = inspection_type;

  const inspections = await ProjectInspection.find(filter)
    .populate('inspector_id', 'name')
    .populate('signed_off_by', 'name')
    .populate('task_id', 'name')
    .sort({ inspection_date: -1 })
    .lean();

  const rows = inspections.map((i: any) => {
    const obj: any = { ...i };
    if (obj.inspector_id) obj.inspector_name = obj.inspector_id.name;
    if (obj.signed_off_by) obj.signed_off_by_name = obj.signed_off_by.name;
    if (obj.task_id) obj.task_name = obj.task_id.name;
    return obj;
  });

  res.json(rows);
}));

router.post('/:projectId/inspections', asyncHandler(async (req, res) => {
  const { task_id, inspection_type, inspection_date, inspector_id, findings, acceptance_criteria, sign_off_required } = req.body;

  if (!inspection_type || !inspection_date || !inspector_id) {
    return res.status(400).json({ error: 'Inspection type, date, and inspector are required' });
  }

  const inspection = await ProjectInspection.create({
    project_id: req.params.projectId,
    task_id, inspection_type, inspection_date, inspector_id,
    findings, acceptance_criteria,
    sign_off_required: sign_off_required || false,
    status: 'scheduled',
  });

  res.status(201).json(inspection);
}));

router.put('/inspections/:id', asyncHandler(async (req, res) => {
  const { findings, non_conformities, corrective_actions, status, signed_off_by } = req.body;

  const fields: Record<string, any> = { findings, non_conformities, corrective_actions, status, signed_off_by };
  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (signed_off_by && status === 'completed') {
    updateData.signed_off_at = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const inspection = await ProjectInspection.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
  res.json(inspection);
}));

// ============================================
// COMPLIANCE TRACKING
// ============================================

router.get('/:projectId/compliance', asyncHandler(async (req, res) => {
  const compliance = await ProjectCompliance.find({ project_id: req.params.projectId })
    .populate('template_id', 'template_name compliance_standard')
    .sort({ created_at: -1 })
    .lean();

  const rows = compliance.map((c: any) => {
    const obj: any = { ...c };
    if (obj.template_id) {
      obj.template_name = obj.template_id.template_name;
      obj.compliance_standard = obj.template_id.compliance_standard;
    }
    return obj;
  });

  res.json(rows);
}));

router.post('/:projectId/compliance', asyncHandler(async (req, res) => {
  const { template_id, compliance_status, last_audit_date, next_audit_date, audit_notes } = req.body;

  if (!template_id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const entry = await ProjectCompliance.create({
    project_id: req.params.projectId,
    template_id,
    compliance_status: compliance_status || 'not_started',
    last_audit_date, next_audit_date, audit_notes,
  });

  res.status(201).json(entry);
}));

router.get('/compliance-templates', asyncHandler(async (req, res) => {
  const { compliance_standard, is_active } = req.query;
  const filter: any = {};
  if (compliance_standard) filter.compliance_standard = compliance_standard;
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ComplianceTemplate.find(filter).sort({ template_name: 1 }).lean(),
    pagination, filter, ComplianceTemplate
  );

  res.json(paginatedResult);
}));

export default router;

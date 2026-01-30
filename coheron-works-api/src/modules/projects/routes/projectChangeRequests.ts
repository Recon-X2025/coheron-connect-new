import express from 'express';
import Project from '../../../models/Project.js';
import ChangeRequest from '../../../models/ChangeRequest.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// CHANGE REQUESTS (Fixed to match schema)
// ============================================

// Get project change requests
router.get('/:projectId/change-requests', asyncHandler(async (req, res) => {
  const { status, change_type } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;
  if (change_type) filter.change_type = change_type;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ChangeRequest.find(filter)
      .populate('requested_by', 'name')
      .populate('approved_by', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, ChangeRequest
  );

  const data = paginatedResult.data.map((cr: any) => {
    const obj: any = { ...cr };
    if (obj.requested_by) obj.requested_by_name = obj.requested_by.name;
    if (obj.approved_by) obj.approved_by_name = obj.approved_by.name;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get change request by ID
router.get('/change-requests/:id', asyncHandler(async (req, res) => {
  const cr = await ChangeRequest.findById(req.params.id)
    .populate('requested_by', 'name email')
    .populate('approved_by', 'name email')
    .lean();

  if (!cr) {
    return res.status(404).json({ error: 'Change request not found' });
  }

  const obj: any = { ...cr };
  if (obj.requested_by) {
    obj.requested_by_name = obj.requested_by.name;
    obj.requested_by_email = obj.requested_by.email;
  }
  if (obj.approved_by) {
    obj.approved_by_name = obj.approved_by.name;
    obj.approved_by_email = obj.approved_by.email;
  }

  res.json(obj);
}));

// Create change request
router.post('/:projectId/change-requests', asyncHandler(async (req, res) => {
  const {
    change_type, title, description, scope_impact, cost_impact,
    timeline_impact_days, original_contract_value, revised_contract_value,
    requested_by, approval_workflow,
  } = req.body;

  if (!change_type || !title) {
    return res.status(400).json({ error: 'Change type and title are required' });
  }

  let changeCode = req.body.change_code;
  if (!changeCode) {
    const project = await Project.findById(req.params.projectId).lean();
    const projectCode = project?.code || 'PROJ';
    const count = await ChangeRequest.countDocuments({ project_id: req.params.projectId });
    const num = count + 1;
    changeCode = `${projectCode}-CR-${num.toString().padStart(4, '0')}`;
  }

  const cr = await ChangeRequest.create({
    project_id: req.params.projectId,
    change_code: changeCode,
    change_type, title, description, scope_impact,
    cost_impact: cost_impact || 0,
    timeline_impact_days: timeline_impact_days || 0,
    original_contract_value, revised_contract_value,
    requested_by,
    approval_workflow: approval_workflow || null,
    status: 'draft',
  });

  res.status(201).json(cr);
}));

// Update change request
router.put('/change-requests/:id', asyncHandler(async (req, res) => {
  const {
    change_type, title, description, scope_impact, cost_impact,
    timeline_impact_days, original_contract_value, revised_contract_value,
    status, approved_by, approval_workflow, implementation_date,
  } = req.body;

  const fields: Record<string, any> = {
    change_type, title, description, scope_impact, cost_impact,
    timeline_impact_days, original_contract_value, revised_contract_value,
    status, approved_by, approval_workflow, implementation_date,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (status === 'approved' && approved_by) {
    updateData.approved_at = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const cr = await ChangeRequest.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!cr) return res.status(404).json({ error: 'Change request not found' });
  res.json(cr);
}));

// Delete change request
router.delete('/change-requests/:id', asyncHandler(async (req, res) => {
  const cr = await ChangeRequest.findByIdAndDelete(req.params.id);
  if (!cr) return res.status(404).json({ error: 'Change request not found' });
  res.json({ message: 'Change request deleted successfully' });
}));

export default router;

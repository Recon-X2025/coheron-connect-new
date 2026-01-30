import express from 'express';
import { Incident, Problem, Change, ChangeCabMember } from '../models/Incident.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// INCIDENTS
// ============================================

// Get all incidents
router.get('/incidents', asyncHandler(async (req, res) => {
  const { status, priority, impact } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (impact) filter.impact = impact;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Incident.find(filter)
      .populate({ path: 'assigned_to', populate: { path: 'user_id', select: 'name' } })
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, Incident
  );

  const data = paginatedResult.data.map((i: any) => ({
    ...i,
    id: i._id,
    agent_user_id: i.assigned_to?.user_id?._id,
    assigned_to_name: i.assigned_to?.user_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create incident
router.post('/incidents', asyncHandler(async (req, res) => {
  const { title, description, priority, impact, urgency, affected_users, affected_systems } = req.body;

  if (!title || !description || !priority || !impact || !urgency) {
    return res.status(400).json({
      error: 'Title, description, priority, impact, and urgency are required',
    });
  }

  const count = await Incident.countDocuments();
  const num = count + 1;
  const incidentNumber = `INC-${Date.now()}-${num.toString().padStart(6, '0')}`;

  const incident = await Incident.create({
    incident_number: incidentNumber,
    title,
    description,
    priority,
    impact,
    urgency,
    affected_users,
    affected_systems: affected_systems || [],
  });

  res.status(201).json(incident);
}));

// Update incident
router.put('/incidents/:id', asyncHandler(async (req, res) => {
  const { status, assigned_to, resolution, resolved_at } = req.body;
  const updateData: any = {};

  if (status !== undefined) {
    updateData.status = status;
    if (status === 'resolved' && !resolved_at) updateData.resolved_at = new Date();
    if (status === 'closed' && !resolved_at) updateData.closed_at = new Date();
  }
  if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
  if (resolution !== undefined) updateData.resolution = resolution;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await Incident.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  res.json(result);
}));

// ============================================
// PROBLEMS
// ============================================

// Get all problems
router.get('/problems', asyncHandler(async (req, res) => {
  const { status, priority } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Problem.find(filter)
      .populate({ path: 'assigned_to', populate: { path: 'user_id', select: 'name' } })
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, Problem
  );

  const data = paginatedResult.data.map((p: any) => ({
    ...p,
    id: p._id,
    agent_user_id: p.assigned_to?.user_id?._id,
    assigned_to_name: p.assigned_to?.user_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create problem
router.post('/problems', asyncHandler(async (req, res) => {
  const { title, description, priority, related_incidents } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const count = await Problem.countDocuments();
  const num = count + 1;
  const problemNumber = `PRB-${Date.now()}-${num.toString().padStart(6, '0')}`;

  const problem = await Problem.create({
    problem_number: problemNumber,
    title,
    description,
    priority: priority || 'medium',
    related_incidents: related_incidents || [],
  });

  res.status(201).json(problem);
}));

// Update problem
router.put('/problems/:id', asyncHandler(async (req, res) => {
  const { status, assigned_to, root_cause_analysis, solution, known_error, resolved_at } = req.body;
  const updateData: any = {};

  if (status !== undefined) {
    updateData.status = status;
    if (status === 'resolved' && !resolved_at) updateData.resolved_at = new Date();
  }
  if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
  if (root_cause_analysis !== undefined) updateData.root_cause_analysis = root_cause_analysis;
  if (solution !== undefined) updateData.solution = solution;
  if (known_error !== undefined) updateData.known_error = known_error;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await Problem.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Problem not found' });
  }

  res.json(result);
}));

// ============================================
// CHANGE REQUESTS
// ============================================

// Get all change requests
router.get('/changes', asyncHandler(async (req, res) => {
  const { status, change_type, priority } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (change_type) filter.change_type = change_type;
  if (priority) filter.priority = priority;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Change.find(filter)
      .populate('requested_by', 'name')
      .populate('approved_by', 'name')
      .populate('implemented_by', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, Change
  );

  const data = paginatedResult.data.map((c: any) => ({
    ...c,
    id: c._id,
    requested_by_name: c.requested_by?.name,
    approved_by_name: c.approved_by?.name,
    implemented_by_name: c.implemented_by?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create change request
router.post('/changes', asyncHandler(async (req, res) => {
  const { title, description, change_type, priority, requested_by, risk_level, impact_analysis, rollback_plan, scheduled_start, scheduled_end } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const count = await Change.countDocuments();
  const num = count + 1;
  const changeNumber = `CHG-${Date.now()}-${num.toString().padStart(6, '0')}`;

  const change = await Change.create({
    change_number: changeNumber,
    title,
    description,
    change_type: change_type || 'normal',
    priority: priority || 'medium',
    requested_by,
    risk_level: risk_level || 'medium',
    impact_analysis,
    rollback_plan,
    scheduled_start,
    scheduled_end,
  });

  res.status(201).json(change);
}));

// Update change request
router.put('/changes/:id', asyncHandler(async (req, res) => {
  const { status, approved_by, implemented_by, actual_start, actual_end, risk_level, impact_analysis } = req.body;
  const updateData: any = {};

  if (status !== undefined) updateData.status = status;
  if (approved_by !== undefined) updateData.approved_by = approved_by;
  if (implemented_by !== undefined) updateData.implemented_by = implemented_by;
  if (actual_start !== undefined) updateData.actual_start = actual_start;
  if (actual_end !== undefined) updateData.actual_end = actual_end;
  if (risk_level !== undefined) updateData.risk_level = risk_level;
  if (impact_analysis !== undefined) updateData.impact_analysis = impact_analysis;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await Change.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Change request not found' });
  }

  res.json(result);
}));

// Add CAB member
router.post('/changes/:id/cab', asyncHandler(async (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const result = await ChangeCabMember.findOneAndUpdate(
    { change_id: req.params.id, user_id },
    { change_id: req.params.id, user_id, role: role || 'reviewer' },
    { upsert: true, new: true }
  );

  res.status(201).json(result);
}));

// Approve/reject change (CAB member)
router.post('/changes/:id/cab/:memberId/approve', asyncHandler(async (req, res) => {
  const { approval_status, comments } = req.body;
  if (!approval_status) {
    return res.status(400).json({ error: 'Approval status is required' });
  }

  const updateData: any = { approval_status };
  if (comments !== undefined) updateData.comments = comments;
  if (approval_status === 'approved' || approval_status === 'rejected') {
    updateData.approved_at = new Date();
  }

  const result = await ChangeCabMember.findOneAndUpdate(
    { change_id: req.params.id, _id: req.params.memberId },
    updateData,
    { new: true }
  );

  if (!result) {
    return res.status(404).json({ error: 'CAB member not found' });
  }

  res.json(result);
}));

export default router;

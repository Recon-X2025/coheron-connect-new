import express from 'express';
import { SupportTeam, SupportAgent } from '../../../models/SupportTeam.js';
import { SupportTicket } from '../../../models/SupportTicket.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// SUPPORT TEAMS
// ============================================

// Get all teams
router.get('/', asyncHandler(async (req, res) => {
  const teams = await SupportTeam.find({ is_active: true }).sort({ name: 1 }).lean();

  const teamsWithCounts = await Promise.all(
    teams.map(async (team: any) => {
      const [agent_count, ticket_count] = await Promise.all([
        SupportAgent.countDocuments({ team_id: team._id }),
        SupportTicket.countDocuments({ assigned_team_id: team._id }),
      ]);
      return { ...team, id: team._id, agent_count, ticket_count };
    })
  );

  res.json(teamsWithCounts);
}));

// Get team by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const team = await SupportTeam.findById(req.params.id).lean();
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const agent_count = await SupportAgent.countDocuments({ team_id: team._id });
  const agents = await SupportAgent.find({ team_id: req.params.id, is_active: true })
    .populate('user_id', 'name email')
    .lean();

  const agentsWithNames = agents.map((a: any) => ({
    ...a,
    id: a._id,
    user_name: a.user_id?.name,
    user_email: a.user_id?.email,
  }));

  res.json({ ...team, id: team._id, agent_count, agents: agentsWithNames });
}));

// Create team
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, email } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const team = await SupportTeam.create({ name, description, email });
  res.status(201).json(team);
}));

// Update team
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, email, is_active } = req.body;
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (email !== undefined) updateData.email = email;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await SupportTeam.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Team not found' });
  }

  res.json(result);
}));

// ============================================
// SUPPORT AGENTS
// ============================================

// Get all agents
router.get('/agents/all', asyncHandler(async (req, res) => {
  const filter: any = { is_active: true };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    SupportAgent.find(filter)
      .populate('user_id', 'name email')
      .populate('team_id', 'name')
      .sort({ 'user_id.name': 1 })
      .lean(),
    pagination,
    filter,
    SupportAgent
  );

  const data = paginatedResult.data.map((a: any) => ({
    ...a,
    id: a._id,
    user_name: a.user_id?.name,
    user_email: a.user_id?.email,
    team_name: a.team_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create agent
router.post('/agents', asyncHandler(async (req, res) => {
  const { user_id, team_id, agent_type, max_tickets, skills } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const agent = await SupportAgent.create({
    user_id,
    team_id,
    agent_type: agent_type || 'agent',
    max_tickets: max_tickets || 10,
    skills: skills || [],
  });

  res.status(201).json(agent);
}));

// Update agent
router.put('/agents/:id', asyncHandler(async (req, res) => {
  const { team_id, agent_type, max_tickets, skills, is_active } = req.body;
  const updateData: any = {};

  if (team_id !== undefined) updateData.team_id = team_id;
  if (agent_type !== undefined) updateData.agent_type = agent_type;
  if (max_tickets !== undefined) updateData.max_tickets = max_tickets;
  if (skills !== undefined) updateData.skills = skills;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await SupportAgent.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json(result);
}));

export default router;

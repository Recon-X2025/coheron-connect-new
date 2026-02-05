import express from 'express';
import { SupportTicket, TicketNote, TicketAttachment, TicketWatcher, TicketHistory } from '../../../models/SupportTicket.js';
import { SlaPolicy } from '../../../models/SlaPolicy.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { triggerWorkflows } from '../../../shared/middleware/workflowTrigger.js';
import { getWhatsAppService } from '../../crossmodule/services/whatsappService.js';

const router = express.Router();

// ============================================
// SUPPORT TICKETS - CRUD Operations
// ============================================

// Get all tickets
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, priority, assigned_agent_id, assigned_team_id, partner_id, ticket_type, search } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assigned_agent_id) filter.assigned_agent_id = assigned_agent_id;
  if (assigned_team_id) filter.assigned_team_id = assigned_team_id;
  if (partner_id) filter.partner_id = partner_id;
  if (ticket_type) filter.ticket_type = ticket_type;

  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { ticket_number: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SupportTicket.find(filter)
      .populate('partner_id', 'name email')
      .populate({ path: 'assigned_agent_id', populate: { path: 'user_id', select: 'name' } })
      .populate('assigned_team_id', 'name')
      .populate('channel_id', 'name')
      .populate('category_id', 'name')
      .populate('sla_policy_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    SupportTicket
  );

  const tickets = result.data || result;
  const ticketIds = tickets.map((t: any) => t._id);

  const [noteCounts, watcherCounts] = await Promise.all([
    TicketNote.aggregate([
      { $match: { ticket_id: { $in: ticketIds } } },
      { $group: { _id: '$ticket_id', count: { $sum: 1 } } }
    ]),
    TicketWatcher.aggregate([
      { $match: { ticket_id: { $in: ticketIds } } },
      { $group: { _id: '$ticket_id', count: { $sum: 1 } } }
    ]),
  ]);

  const noteCountMap = new Map(noteCounts.map((n: any) => [n._id.toString(), n.count]));
  const watcherCountMap = new Map(watcherCounts.map((w: any) => [w._id.toString(), w.count]));

  const ticketsWithCounts = tickets.map((t: any) => ({
    ...t,
    id: t._id,
    partner_name: t.partner_id?.name,
    partner_email: t.partner_id?.email,
    agent_name: t.assigned_agent_id?.user_id?.name,
    agent_user_id: t.assigned_agent_id?.user_id?._id,
    team_name: t.assigned_team_id?.name,
    channel_name: t.channel_id?.name,
    category_name: t.category_id?.name,
    sla_policy_name: t.sla_policy_id?.name,
    note_count: noteCountMap.get(t._id.toString()) || 0,
    watcher_count: watcherCountMap.get(t._id.toString()) || 0,
  }));

  if (result.data) {
    res.json({ ...result, data: ticketsWithCounts });
  } else {
    res.json(ticketsWithCounts);
  }
}));

// Get ticket by ID with full details
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('partner_id', 'name email')
    .populate({ path: 'assigned_agent_id', populate: { path: 'user_id', select: 'name email' } })
    .populate('assigned_team_id', 'name')
    .populate('channel_id', 'name')
    .populate('category_id', 'name')
    .populate('sla_policy_id', 'name')
    .lean();

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const [notes, attachments, watchers, history, children] = await Promise.all([
    TicketNote.find({ ticket_id: req.params.id }).populate('created_by', 'name').sort({ created_at: 1 }).lean(),
    TicketAttachment.find({ ticket_id: req.params.id }).populate('uploaded_by', 'name').sort({ created_at: 1 }).lean(),
    TicketWatcher.find({ ticket_id: req.params.id }).populate('user_id', 'name email').lean(),
    TicketHistory.find({ ticket_id: req.params.id }).populate('performed_by', 'name').sort({ created_at: -1 }).lean(),
    SupportTicket.find({ parent_ticket_id: req.params.id }).sort({ created_at: 1 }).lean(),
  ]);

  const t: any = ticket;
  res.json({
    ...t,
    id: t._id,
    partner_name: t.partner_id?.name,
    partner_email: t.partner_id?.email,
    agent_name: t.assigned_agent_id?.user_id?.name,
    agent_email: t.assigned_agent_id?.user_id?.email,
    agent_user_id: t.assigned_agent_id?.user_id?._id,
    team_name: t.assigned_team_id?.name,
    channel_name: t.channel_id?.name,
    category_name: t.category_id?.name,
    sla_policy_name: t.sla_policy_id?.name,
    notes: notes.map((n: any) => ({ ...n, id: n._id, created_by_name: n.created_by?.name })),
    attachments: attachments.map((a: any) => ({ ...a, id: a._id, uploaded_by_name: a.uploaded_by?.name })),
    watchers: watchers.map((w: any) => ({ ...w, id: w._id, user_name: w.user_id?.name, user_email: w.user_id?.email })),
    history: history.map((h: any) => ({ ...h, id: h._id, performed_by_name: h.performed_by?.name })),
    children,
  });
}));

// Create ticket
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    subject, description, ticket_type, priority, channel_id, category_id,
    partner_id, contact_id, assigned_team_id, source, tags, custom_fields, is_public,
  } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }

  const count = await SupportTicket.countDocuments();
  const num = count + 1;
  const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

  let slaPolicyId = null;
  let firstResponseDeadline = null;
  let resolutionDeadline = null;

  try {
    if (priority) {
      const sla = await SlaPolicy.findOne({ priority, is_active: true });
      if (sla) {
        slaPolicyId = sla._id;
        const now = new Date();
        firstResponseDeadline = new Date(now.getTime() + sla.first_response_time_minutes * 60000);
        resolutionDeadline = new Date(now.getTime() + sla.resolution_time_minutes * 60000);
      }
    }
  } catch (slaError) {
    console.warn('Failed to assign SLA policy (non-critical):', slaError);
  }

  const ticket = await SupportTicket.create({
    ticket_number: ticketNumber,
    subject,
    description,
    ticket_type: ticket_type || 'issue',
    priority: priority || 'medium',
    channel_id: channel_id || null,
    category_id: category_id || null,
    partner_id: partner_id || null,
    contact_id: contact_id || null,
    assigned_team_id: assigned_team_id || null,
    sla_policy_id: slaPolicyId || null,
    source: source || null,
    tags: tags && Array.isArray(tags) ? tags : (tags ? [tags] : []),
    custom_fields: custom_fields || null,
    is_public: is_public !== undefined ? is_public : true,
    sla_first_response_deadline: firstResponseDeadline || null,
    sla_resolution_deadline: resolutionDeadline || null,
  });

  try {
    await TicketHistory.create({
      ticket_id: ticket._id,
      action: 'created',
      new_value: 'Ticket created',
      performed_by: req.body.created_by || null,
    });
  } catch (historyError) {
    console.warn('Failed to log ticket history (non-critical):', historyError);
  }

  // Trigger workflows
  triggerWorkflows('on_create', 'SupportTicket', ticket._id.toString());

  res.status(201).json(ticket);
}));

// Update ticket
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const {
    subject, description, ticket_type, status, priority, channel_id,
    category_id, assigned_agent_id, assigned_team_id, tags, custom_fields,
  } = req.body;

  const oldTicket = await SupportTicket.findById(req.params.id);
  if (!oldTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const updateData: any = {};
  const fields: any = { subject, description, ticket_type, status, priority, channel_id, category_id, assigned_agent_id, assigned_team_id, tags, custom_fields };

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (status === 'in_progress' && oldTicket.status !== 'in_progress') {
    updateData.first_response_at = new Date();
    if (assigned_agent_id) updateData.first_response_by = assigned_agent_id;
  }
  if (status === 'resolved' && oldTicket.status !== 'resolved') {
    updateData.resolved_at = new Date();
    if (assigned_agent_id) updateData.resolved_by = assigned_agent_id;
  }
  if (status === 'closed' && oldTicket.status !== 'closed') {
    updateData.closed_at = new Date();
    if (assigned_agent_id) updateData.closed_by = assigned_agent_id;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await SupportTicket.findByIdAndUpdate(req.params.id, updateData, { new: true });

  // Trigger workflows
  triggerWorkflows('on_update', 'SupportTicket', req.params.id);

  if (status && status !== oldTicket.status) {
    await TicketHistory.create({ ticket_id: req.params.id, action: 'status_changed', old_value: oldTicket.status, new_value: status, performed_by: req.body.updated_by || null });
  }
  if (priority && priority !== oldTicket.priority) {
    await TicketHistory.create({ ticket_id: req.params.id, action: 'priority_changed', old_value: oldTicket.priority, new_value: priority, performed_by: req.body.updated_by || null });
  }
  if (assigned_agent_id && String(assigned_agent_id) !== String(oldTicket.assigned_agent_id)) {
    await TicketHistory.create({ ticket_id: req.params.id, action: 'assigned', old_value: String(oldTicket.assigned_agent_id), new_value: String(assigned_agent_id), performed_by: req.body.updated_by || null });
  }

  res.json(result);
}));

// Delete ticket
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await SupportTicket.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  res.json({ message: 'Ticket deleted successfully' });
}));

// ============================================
// TICKET ACTIONS
// ============================================

// Merge tickets
router.post('/:id/merge', authenticate, asyncHandler(async (req, res) => {
  const { merge_into_ticket_id } = req.body;
  if (!merge_into_ticket_id) {
    return res.status(400).json({ error: 'Target ticket ID is required' });
  }

  await SupportTicket.findByIdAndUpdate(req.params.id, { merged_from_ticket_id: merge_into_ticket_id, status: 'closed' });

  await TicketNote.create({
    ticket_id: merge_into_ticket_id,
    note_type: 'internal',
    content: `Ticket ${req.params.id} was merged into this ticket`,
    created_by: req.body.merged_by || null,
  });

  res.json({ message: 'Tickets merged successfully' });
}));

// Split ticket
router.post('/:id/split', authenticate, asyncHandler(async (req, res) => {
  const { subjects, descriptions } = req.body;
  if (!subjects || !descriptions || subjects.length !== descriptions.length) {
    return res.status(400).json({ error: 'Subjects and descriptions arrays must match' });
  }

  const parent = await SupportTicket.findById(req.params.id);
  if (!parent) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const childTickets = [];
  for (let i = 0; i < subjects.length; i++) {
    const count = await SupportTicket.countDocuments();
    const num = count + i + 1;
    const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

    const child = await SupportTicket.create({
      ticket_number: ticketNumber,
      subject: subjects[i],
      description: descriptions[i],
      ticket_type: parent.ticket_type,
      priority: parent.priority,
      channel_id: parent.channel_id,
      category_id: parent.category_id,
      partner_id: parent.partner_id,
      assigned_team_id: parent.assigned_team_id,
      parent_ticket_id: parent._id,
      sla_policy_id: parent.sla_policy_id,
      tags: parent.tags,
      is_public: parent.is_public,
    });
    childTickets.push(child);
  }

  res.status(201).json({ message: 'Ticket split successfully', child_tickets: childTickets });
}));

// Transfer ticket
router.post('/:id/transfer', authenticate, asyncHandler(async (req, res) => {
  const { assigned_team_id, assigned_agent_id, reason } = req.body;
  const updateData: any = {};

  if (assigned_team_id) updateData.assigned_team_id = assigned_team_id;
  if (assigned_agent_id !== undefined) updateData.assigned_agent_id = assigned_agent_id;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'Must specify team or agent to transfer to' });
  }

  const result = await SupportTicket.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  if (reason) {
    await TicketNote.create({
      ticket_id: req.params.id,
      note_type: 'internal',
      content: `Ticket transferred. Reason: ${reason}`,
      created_by: req.body.transferred_by || null,
    });
  }

  await TicketHistory.create({
    ticket_id: req.params.id,
    action: 'transferred',
    new_value: `Transferred to team: ${assigned_team_id}, agent: ${assigned_agent_id}`,
    performed_by: req.body.transferred_by || null,
  });

  res.json(result);
}));

// ============================================
// TICKET NOTES
// ============================================

// Add note
router.post('/:id/notes', authenticate, asyncHandler(async (req, res) => {
  const { note_type, content, created_by, is_pinned } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Note content is required' });
  }

  const note = await TicketNote.create({
    ticket_id: req.params.id,
    note_type: note_type || 'public',
    content,
    created_by,
    is_pinned: is_pinned || false,
  });

  res.status(201).json(note);
}));

// ============================================
// TICKET WATCHERS
// ============================================

// Add watcher
router.post('/:id/watchers', authenticate, asyncHandler(async (req, res) => {
  const { user_id } = req.body;

  const existing = await TicketWatcher.findOne({ ticket_id: req.params.id, user_id }).lean();
  if (existing) {
    return res.status(400).json({ error: 'User is already watching this ticket' });
  }

  const watcher = await TicketWatcher.create({ ticket_id: req.params.id, user_id });
  res.status(201).json(watcher);
}));

// Remove watcher
router.delete('/:id/watchers/:userId', authenticate, asyncHandler(async (req, res) => {
  const result = await TicketWatcher.findOneAndDelete({ ticket_id: req.params.id, user_id: req.params.userId });
  if (!result) {
    return res.status(404).json({ error: 'Watcher not found' });
  }
  res.json({ message: 'Watcher removed successfully' });
}));

// Add conversation
router.post('/:id/conversations', authenticate, asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { $push: { conversations: req.body } },
    { new: true }
  );
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  // If this is a WhatsApp ticket and direction is outbound, send via WhatsApp
  const cf = (ticket as any).custom_fields;
  if (cf?.channel_type === 'whatsapp' && cf?.whatsapp_phone && req.body.direction === 'outbound') {
    try {
      const wa = getWhatsAppService();
      if (wa.isEnabled()) {
        await wa.sendTextMessage(cf.whatsapp_phone, req.body.body_text || '');
      }
    } catch (err) {
      // Non-critical: message saved but WhatsApp send failed
    }
  }

  res.status(201).json(ticket);
}));

// Log time entry
router.post('/:id/time-entries', authenticate, asyncHandler(async (req, res) => {
  const entry = req.body;
  if (entry.started_at && entry.ended_at) {
    entry.duration_minutes = Math.round((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000);
  }

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    {
      $push: { time_entries: entry },
      $inc: { total_time_spent_minutes: entry.duration_minutes || 0 },
    },
    { new: true }
  );
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  res.status(201).json(ticket);
}));

// Escalate ticket
router.post('/:id/escalate', authenticate, asyncHandler(async (req, res) => {
  const { level, reason, escalated_by } = req.body;
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    {
      escalation: {
        is_escalated: true,
        level: level || 1,
        reason,
        escalated_at: new Date(),
        escalated_by,
      },
    },
    { new: true }
  );
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  await TicketHistory.create({
    ticket_id: req.params.id,
    action: 'escalated',
    new_value: `Escalated to level ${level || 1}. Reason: ${reason}`,
    performed_by: escalated_by,
  });

  res.json(ticket);
}));

// Record satisfaction
router.put('/:id/satisfaction', authenticate, asyncHandler(async (req, res) => {
  const { rating, feedback } = req.body;
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    {
      satisfaction: {
        rating,
        feedback,
        responded_at: new Date(),
      },
    },
    { new: true }
  );
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  res.json(ticket);
}));

export default router;

import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { MarketingEvent } from '../models/MarketingEvent.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { EventSession } from '../models/EventSession.js';

const router = express.Router();

// ============ EVENTS ============

// List events
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { status, event_type, search, page = 1, limit = 20 } = req.query;

  const filter: any = { tenant_id: tenantId };
  if (status) filter.status = status;
  if (event_type) filter.event_type = event_type;
  if (search) filter.event_name = { $regex: search, $options: 'i' };

  const events = await MarketingEvent.find(filter)
    .sort({ start_date: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .lean();

  const total = await MarketingEvent.countDocuments(filter);
  res.json({ events, total, page: Number(page), limit: Number(limit) });
}));

// Get event by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const event = await MarketingEvent.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
}));

// Create event
router.post('/', asyncHandler(async (req, res) => {
  const event = await MarketingEvent.create({
    ...req.body,
    tenant_id: req.user?.tenant_id,
    organizer_id: req.user?.userId,
  });
  res.status(201).json(event);
}));

// Update event
router.put('/:id', asyncHandler(async (req, res) => {
  const event = await MarketingEvent.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: req.body },
    { new: true },
  );
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
}));

// Delete event
router.delete('/:id', asyncHandler(async (req, res) => {
  const event = await MarketingEvent.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  // Clean up registrations and sessions
  await EventRegistration.deleteMany({ event_id: req.params.id });
  await EventSession.deleteMany({ event_id: req.params.id });
  res.json({ message: 'Event deleted successfully' });
}));

// ============ SESSIONS ============

// List sessions for an event
router.get('/:eventId/sessions', asyncHandler(async (req, res) => {
  const sessions = await EventSession.find({
    event_id: req.params.eventId,
    tenant_id: req.user?.tenant_id,
  }).sort({ start_time: 1 }).lean();
  res.json(sessions);
}));

// Create session
router.post('/:eventId/sessions', asyncHandler(async (req, res) => {
  const session = await EventSession.create({
    ...req.body,
    event_id: req.params.eventId,
    tenant_id: req.user?.tenant_id,
  });
  res.status(201).json(session);
}));

// Update session
router.put('/sessions/:id', asyncHandler(async (req, res) => {
  const session = await EventSession.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: req.body },
    { new: true },
  );
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
}));

// Delete session
router.delete('/sessions/:id', asyncHandler(async (req, res) => {
  const session = await EventSession.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ message: 'Session deleted successfully' });
}));

// ============ REGISTRATIONS ============

// List registrations for an event
router.get('/:eventId/registrations', asyncHandler(async (req, res) => {
  const { check_in_status, payment_status, search, page = 1, limit = 50 } = req.query;

  const filter: any = { event_id: req.params.eventId, tenant_id: req.user?.tenant_id };
  if (check_in_status) filter.check_in_status = check_in_status;
  if (payment_status) filter.payment_status = payment_status;
  if (search) {
    filter.$or = [
      { attendee_name: { $regex: search, $options: 'i' } },
      { attendee_email: { $regex: search, $options: 'i' } },
    ];
  }

  const registrations = await EventRegistration.find(filter)
    .sort({ registration_date: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .lean();

  const total = await EventRegistration.countDocuments(filter);
  res.json({ registrations, total, page: Number(page), limit: Number(limit) });
}));

// Create registration
router.post('/:eventId/registrations', asyncHandler(async (req, res) => {
  const event = await MarketingEvent.findOne({ _id: req.params.eventId, tenant_id: req.user?.tenant_id });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.registration_open) return res.status(400).json({ error: 'Registration is closed' });

  const registration = await EventRegistration.create({
    ...req.body,
    event_id: req.params.eventId,
    tenant_id: req.user?.tenant_id,
  });

  // Update ticket sold count
  if (req.body.ticket_type) {
    await MarketingEvent.updateOne(
      { _id: req.params.eventId, 'ticket_types.name': req.body.ticket_type },
      { $inc: { 'ticket_types.$.sold': 1 } },
    );
  }

  res.status(201).json(registration);
}));

// Check-in endpoint
router.post('/registrations/:id/check-in', asyncHandler(async (req, res) => {
  const registration = await EventRegistration.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: { check_in_status: 'checked_in', check_in_time: new Date() } },
    { new: true },
  );
  if (!registration) return res.status(404).json({ error: 'Registration not found' });
  res.json(registration);
}));

// ============ ANALYTICS ============

// Event analytics
router.get('/:eventId/analytics', asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;
  const tenantId = req.user?.tenant_id;

  const event = await MarketingEvent.findOne({ _id: eventId, tenant_id: tenantId }).lean();
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const totalRegistrations = await EventRegistration.countDocuments({ event_id: eventId, tenant_id: tenantId });
  const checkedIn = await EventRegistration.countDocuments({ event_id: eventId, tenant_id: tenantId, check_in_status: 'checked_in' });
  const paidCount = await EventRegistration.countDocuments({ event_id: eventId, tenant_id: tenantId, payment_status: 'paid' });

  // Revenue from ticket types
  const totalRevenue = (event.ticket_types || []).reduce((sum, t) => sum + (t.price * t.sold), 0);
  const totalCapacity = (event.ticket_types || []).reduce((sum, t) => sum + t.quantity, 0);
  const totalSold = (event.ticket_types || []).reduce((sum, t) => sum + t.sold, 0);

  const sessionCount = await EventSession.countDocuments({ event_id: eventId, tenant_id: tenantId });

  res.json({
    total_registrations: totalRegistrations,
    checked_in: checkedIn,
    check_in_rate: totalRegistrations > 0 ? ((checkedIn / totalRegistrations) * 100).toFixed(1) : 0,
    paid_registrations: paidCount,
    total_revenue: totalRevenue,
    total_capacity: totalCapacity,
    tickets_sold: totalSold,
    fill_rate: totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(1) : 0,
    session_count: sessionCount,
  });
}));

export default router;

import express from 'express';
import {
  parseSendGridEmail,
  parseMailgunEmail,
  parseGenericEmail,
  getEmailBody,
  ParsedEmail,
} from '../../../shared/utils/emailParser.js';
import { SupportTicket, TicketNote, TicketHistory, TicketAttachment } from '../../../models/SupportTicket.js';
import TicketChannel from '../../../models/TicketChannel.js';
import SlaPolicy from '../../../models/SlaPolicy.js';
import Partner from '../../../shared/models/Partner.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

/**
 * Find or create a partner based on email address
 */
async function findOrCreatePartner(
  email: string,
  name?: string
): Promise<any> {
  if (!email) return null;

  const normalizedEmail = email.toLowerCase().trim();

  const existingPartner = await Partner.findOne({
    email: { $regex: `^${normalizedEmail}$`, $options: 'i' },
  });

  if (existingPartner) {
    return existingPartner._id;
  }

  const partnerName = name || normalizedEmail.split('@')[0];
  const newPartner = await Partner.create({
    name: partnerName,
    email: normalizedEmail,
    type: 'contact',
  });

  return newPartner._id;
}

/**
 * Get or create email channel
 */
async function getEmailChannel(): Promise<any> {
  const channel = await TicketChannel.findOne({
    channel_type: 'email',
    is_active: true,
  });

  if (channel) {
    return channel._id;
  }

  const newChannel = await TicketChannel.create({
    name: 'Email',
    channel_type: 'email',
    is_active: true,
  });

  return newChannel._id;
}

/**
 * Extract ticket number from email subject (e.g., "Re: [TKT-123456] Original Subject")
 */
function extractTicketNumberFromSubject(subject: string): string | null {
  if (!subject) return null;

  const match = subject.match(/TKT-[\d-]+/i);
  return match ? match[0] : null;
}

/**
 * Check if email is a reply to an existing ticket
 */
async function findTicketByMessageId(
  messageId: string,
  inReplyTo?: string,
  references?: string[]
): Promise<any> {
  if (!messageId && !inReplyTo && (!references || references.length === 0)) {
    return null;
  }

  const searchIds = [messageId, inReplyTo, ...(references || [])].filter(
    Boolean
  );

  for (const msgId of searchIds) {
    const ticket = await SupportTicket.findOne({
      $or: [
        { 'custom_fields.email_message_id': msgId },
        { 'custom_fields.email_in_reply_to': msgId },
      ],
    });

    if (ticket) {
      return ticket._id;
    }
  }

  return null;
}

/**
 * Find ticket by ticket number in subject
 */
async function findTicketByNumber(ticketNumber: string): Promise<any> {
  const ticket = await SupportTicket.findOne({ ticket_number: ticketNumber });
  return ticket ? ticket._id : null;
}

/**
 * Create ticket from parsed email
 */
async function createTicketFromEmail(parsedEmail: ParsedEmail): Promise<any> {
  const partnerId = await findOrCreatePartner(
    parsedEmail.from.email,
    parsedEmail.from.name
  );

  const channelId = await getEmailChannel();

  let existingTicketId = await findTicketByMessageId(
    parsedEmail.messageId || '',
    parsedEmail.inReplyTo,
    parsedEmail.references
  );

  if (!existingTicketId) {
    const ticketNumber = extractTicketNumberFromSubject(parsedEmail.subject);
    if (ticketNumber) {
      existingTicketId = await findTicketByNumber(ticketNumber);
    }
  }

  const description = getEmailBody(parsedEmail);

  const ticketCount = await SupportTicket.countDocuments();
  const num = ticketCount + 1;
  const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

  let slaPolicyId = null;
  const priority = 'medium';
  const slaPolicy = await SlaPolicy.findOne({ priority, is_active: true });
  if (slaPolicy) {
    slaPolicyId = slaPolicy._id;
  }

  let firstResponseDeadline = null;
  let resolutionDeadline = null;
  if (slaPolicy) {
    const now = new Date();
    firstResponseDeadline = new Date(
      now.getTime() + (slaPolicy as any).first_response_time_minutes * 60000
    );
    resolutionDeadline = new Date(
      now.getTime() + (slaPolicy as any).resolution_time_minutes * 60000
    );
  }

  const customFields = {
    email_message_id: parsedEmail.messageId,
    email_in_reply_to: parsedEmail.inReplyTo,
    email_references: parsedEmail.references,
    email_from: parsedEmail.from.email,
    email_from_name: parsedEmail.from.name,
    email_to: parsedEmail.to,
    email_date: parsedEmail.date?.toISOString(),
  };

  if (existingTicketId) {
    await TicketNote.create({
      ticket_id: existingTicketId,
      note_type: 'public',
      content: `Email reply received:\n\n${description}`,
      created_by: null,
    });

    await SupportTicket.findOneAndUpdate(
      { _id: existingTicketId, status: { $in: ['closed', 'resolved'] } },
      { status: 'open' }
    );

    await TicketHistory.create({
      ticket_id: existingTicketId,
      action: 'email_reply',
      new_value: `Email reply received from ${parsedEmail.from.email}`,
      performed_by: null,
    });

    const ticket = await SupportTicket.findById(existingTicketId);
    return { ...ticket?.toObject(), is_reply: true };
  }

  const ticket = await SupportTicket.create({
    ticket_number: ticketNumber,
    subject: parsedEmail.subject || '(No Subject)',
    description: description || '(No Content)',
    ticket_type: 'issue',
    priority,
    channel_id: channelId,
    partner_id: partnerId,
    sla_policy_id: slaPolicyId,
    source: parsedEmail.from.email,
    tags: ['email'],
    custom_fields: customFields,
    sla_first_response_deadline: firstResponseDeadline,
    sla_resolution_deadline: resolutionDeadline,
  });

  await TicketHistory.create({
    ticket_id: ticket._id,
    action: 'created',
    new_value: 'Ticket created from email',
    performed_by: null,
  });

  if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
    for (const attachment of parsedEmail.attachments) {
      await TicketAttachment.create({
        ticket_id: ticket._id,
        file_name: attachment.filename,
        mime_type: attachment.contentType,
        file_size: attachment.size || 0,
        file_url: null,
        uploaded_by: null,
      });
    }
  }

  return ticket;
}

/**
 * SendGrid webhook endpoint
 */
router.post('/sendgrid', express.json(), asyncHandler(async (req, res) => {
  const emails = Array.isArray(req.body) ? req.body : [req.body];

  const createdTickets = [];

  for (const emailData of emails) {
    const parsedEmail = parseSendGridEmail(emailData);
    const ticket = await createTicketFromEmail(parsedEmail);
    createdTickets.push(ticket);
  }

  res.status(200).json({
    success: true,
    message: `Processed ${createdTickets.length} email(s)`,
    tickets: createdTickets,
  });
}));

/**
 * Mailgun webhook endpoint
 */
router.post('/mailgun', express.urlencoded({ extended: true }), asyncHandler(async (req, res) => {
  const parsedEmail = parseMailgunEmail(req.body);
  const ticket = await createTicketFromEmail(parsedEmail);

  res.status(200).json({
    success: true,
    message: 'Email processed successfully',
    ticket,
  });
}));

/**
 * Generic email webhook endpoint (for custom integrations)
 */
router.post('/generic', express.json(), asyncHandler(async (req, res) => {
  const parsedEmail = parseGenericEmail(req.body);
  const ticket = await createTicketFromEmail(parsedEmail);

  res.status(200).json({
    success: true,
    message: 'Email processed successfully',
    ticket,
  });
}));

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-webhook' });
});

export default router;

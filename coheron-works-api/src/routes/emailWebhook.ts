import express from 'express';
import pool from '../database/connection.js';
import {
  parseSendGridEmail,
  parseMailgunEmail,
  parseGenericEmail,
  getEmailBody,
  ParsedEmail,
} from '../utils/emailParser.js';

const router = express.Router();

/**
 * Find or create a partner based on email address
 */
async function findOrCreatePartner(
  email: string,
  name?: string
): Promise<number | null> {
  if (!email) return null;

  // Normalize email (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();

  // Try to find existing partner by email
  const existingPartner = await pool.query(
    'SELECT id FROM partners WHERE LOWER(email) = $1 LIMIT 1',
    [normalizedEmail]
  );

  if (existingPartner.rows.length > 0) {
    return existingPartner.rows[0].id;
  }

  // Create new partner if not found
  const partnerName = name || normalizedEmail.split('@')[0];
  const newPartner = await pool.query(
    `INSERT INTO partners (name, email, type)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [partnerName, normalizedEmail, 'contact']
  );

  return newPartner.rows[0].id;
}

/**
 * Get or create email channel
 */
async function getEmailChannel(): Promise<number | null> {
  const channel = await pool.query(
    `SELECT id FROM ticket_channels 
     WHERE channel_type = 'email' AND is_active = true 
     LIMIT 1`
  );

  if (channel.rows.length > 0) {
    return channel.rows[0].id;
  }

  // Create email channel if it doesn't exist
  const newChannel = await pool.query(
    `INSERT INTO ticket_channels (name, channel_type, is_active)
     VALUES ($1, $2, $3)
     RETURNING id`,
    ['Email', 'email', true]
  );

  return newChannel.rows[0].id;
}

/**
 * Extract ticket number from email subject (e.g., "Re: [TKT-123456] Original Subject")
 */
function extractTicketNumberFromSubject(subject: string): string | null {
  if (!subject) return null;
  
  // Look for ticket number pattern: TKT- followed by numbers
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
): Promise<number | null> {
  if (!messageId && !inReplyTo && (!references || references.length === 0)) {
    return null;
  }

  // Search in ticket notes or custom fields for message IDs
  // This is a simplified version - you might want to store message IDs in a separate table
  const searchIds = [messageId, inReplyTo, ...(references || [])].filter(
    Boolean
  );

  for (const msgId of searchIds) {
    // Check if message ID is stored in custom_fields
    const ticket = await pool.query(
      `SELECT id FROM support_tickets 
       WHERE custom_fields->>'email_message_id' = $1 
       OR custom_fields->>'email_in_reply_to' = $1
       LIMIT 1`,
      [msgId]
    );

    if (ticket.rows.length > 0) {
      return ticket.rows[0].id;
    }
  }

  return null;
}

/**
 * Find ticket by ticket number in subject
 */
async function findTicketByNumber(ticketNumber: string): Promise<number | null> {
  const ticket = await pool.query(
    'SELECT id FROM support_tickets WHERE ticket_number = $1 LIMIT 1',
    [ticketNumber]
  );

  return ticket.rows.length > 0 ? ticket.rows[0].id : null;
}

/**
 * Create ticket from parsed email
 */
async function createTicketFromEmail(parsedEmail: ParsedEmail): Promise<any> {
  // Find or create partner
  const partnerId = await findOrCreatePartner(
    parsedEmail.from.email,
    parsedEmail.from.name
  );

  // Get email channel
  const channelId = await getEmailChannel();

  // Check if this is a reply to an existing ticket
  // First try to find by message ID
  let existingTicketId = await findTicketByMessageId(
    parsedEmail.messageId || '',
    parsedEmail.inReplyTo,
    parsedEmail.references
  );

  // If not found, try to extract ticket number from subject
  if (!existingTicketId) {
    const ticketNumber = extractTicketNumberFromSubject(parsedEmail.subject);
    if (ticketNumber) {
      existingTicketId = await findTicketByNumber(ticketNumber);
    }
  }

  // Get email body
  const description = getEmailBody(parsedEmail);

  // Generate ticket number
  const ticketCount = await pool.query(
    'SELECT COUNT(*) as count FROM support_tickets'
  );
  const num = parseInt(ticketCount.rows[0]?.count || '0') + 1;
  const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

  // Auto-assign SLA based on priority (default to medium)
  let slaPolicyId = null;
  const priority = 'medium'; // Could be extracted from email subject/body
  const slaResult = await pool.query(
    'SELECT id FROM sla_policies WHERE priority = $1 AND is_active = true LIMIT 1',
    [priority]
  );
  if (slaResult.rows.length > 0) {
    slaPolicyId = slaResult.rows[0].id;
  }

  // Calculate SLA deadlines if SLA policy exists
  let firstResponseDeadline = null;
  let resolutionDeadline = null;
  if (slaPolicyId) {
    const slaPolicy = await pool.query(
      'SELECT * FROM sla_policies WHERE id = $1',
      [slaPolicyId]
    );
    if (slaPolicy.rows.length > 0) {
      const policy = slaPolicy.rows[0];
      const now = new Date();
      firstResponseDeadline = new Date(
        now.getTime() + policy.first_response_time_minutes * 60000
      );
      resolutionDeadline = new Date(
        now.getTime() + policy.resolution_time_minutes * 60000
      );
    }
  }

  // Store email metadata in custom_fields
  const customFields = {
    email_message_id: parsedEmail.messageId,
    email_in_reply_to: parsedEmail.inReplyTo,
    email_references: parsedEmail.references,
    email_from: parsedEmail.from.email,
    email_from_name: parsedEmail.from.name,
    email_to: parsedEmail.to,
    email_date: parsedEmail.date?.toISOString(),
  };

  // If this is a reply, add a note to the existing ticket instead of creating a new one
  if (existingTicketId) {
    // Add note to existing ticket
    await pool.query(
      `INSERT INTO ticket_notes (ticket_id, note_type, content, created_by)
       VALUES ($1, $2, $3, $4)`,
      [
        existingTicketId,
        'public',
        `Email reply received:\n\n${description}`,
        null,
      ]
    );

    // Update ticket status if it was closed/resolved
    await pool.query(
      `UPDATE support_tickets 
       SET status = 'open', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status IN ('closed', 'resolved')`,
      [existingTicketId]
    );

    // Log history
    await pool.query(
      `INSERT INTO ticket_history (ticket_id, action, new_value, performed_by)
       VALUES ($1, 'email_reply', $2, $3)`,
      [
        existingTicketId,
        `Email reply received from ${parsedEmail.from.email}`,
        null,
      ]
    );

    // Return the existing ticket
    const ticket = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [existingTicketId]
    );
    return { ...ticket.rows[0], is_reply: true };
  }

  // Create new ticket
  const result = await pool.query(
    `INSERT INTO support_tickets (
      ticket_number, subject, description, ticket_type, priority,
      channel_id, partner_id, sla_policy_id, source, tags, custom_fields,
      sla_first_response_deadline, sla_resolution_deadline
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      ticketNumber,
      parsedEmail.subject || '(No Subject)',
      description || '(No Content)',
      'issue',
      priority,
      channelId,
      partnerId,
      slaPolicyId,
      parsedEmail.from.email,
      ['email'],
      JSON.stringify(customFields),
      firstResponseDeadline,
      resolutionDeadline,
    ]
  );

  const ticket = result.rows[0];

  // Log history
  await pool.query(
    `INSERT INTO ticket_history (ticket_id, action, new_value, performed_by)
     VALUES ($1, 'created', $2, $3)`,
    [ticket.id, 'Ticket created from email', null]
  );

  // Handle attachments if any
  if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
    for (const attachment of parsedEmail.attachments) {
      await pool.query(
        `INSERT INTO ticket_attachments (
          ticket_id, filename, file_type, file_size, file_path, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          ticket.id,
          attachment.filename,
          attachment.contentType,
          attachment.size || 0,
          null, // In production, you'd save the file and store the path
          null,
        ]
      );
    }
  }

  return ticket;
}

/**
 * SendGrid webhook endpoint
 */
router.post('/sendgrid', express.json(), async (req, res) => {
  try {
    // SendGrid sends emails as an array
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
  } catch (error: any) {
    console.error('Error processing SendGrid email:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Mailgun webhook endpoint
 */
router.post('/mailgun', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const parsedEmail = parseMailgunEmail(req.body);
    const ticket = await createTicketFromEmail(parsedEmail);

    res.status(200).json({
      success: true,
      message: 'Email processed successfully',
      ticket,
    });
  } catch (error: any) {
    console.error('Error processing Mailgun email:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Generic email webhook endpoint (for custom integrations)
 */
router.post('/generic', express.json(), async (req, res) => {
  try {
    const parsedEmail = parseGenericEmail(req.body);
    const ticket = await createTicketFromEmail(parsedEmail);

    res.status(200).json({
      success: true,
      message: 'Email processed successfully',
      ticket,
    });
  } catch (error: any) {
    console.error('Error processing generic email:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-webhook' });
});

export default router;


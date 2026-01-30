import express from 'express';
import { SupportTicket } from '../../../models/SupportTicket.js';
import { getWhatsAppService } from '../services/whatsappService.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import logger from '../../../shared/utils/logger.js';

const router = express.Router();

// GET /webhook — Meta verification handshake
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ error: 'Verification failed' });
});

// POST /webhook — receive inbound messages
router.post('/webhook', asyncHandler(async (req, res) => {
  const body = req.body;

  // Always return 200 quickly to acknowledge receipt
  res.sendStatus(200);

  try {
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value?.messages) continue;

        for (const message of value.messages) {
          const from = message.from; // phone number
          const text = message.text?.body || message.caption || '[non-text message]';
          const contactName = value.contacts?.[0]?.profile?.name || from;

          // Find existing open whatsapp ticket for this phone number, or create one
          let ticket = await SupportTicket.findOne({
            'custom_fields.whatsapp_phone': from,
            'custom_fields.channel_type': 'whatsapp',
            status: { $nin: ['resolved', 'closed'] },
          });

          if (!ticket) {
            const count = await SupportTicket.countDocuments();
            const num = count + 1;
            const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

            ticket = await SupportTicket.create({
              ticket_number: ticketNumber,
              subject: `WhatsApp: ${contactName}`,
              description: text,
              ticket_type: 'issue',
              priority: 'medium',
              status: 'new',
              custom_fields: {
                channel_type: 'whatsapp',
                whatsapp_phone: from,
                whatsapp_contact_name: contactName,
              },
              conversations: [{
                type: 'reply',
                direction: 'inbound',
                channel: 'whatsapp',
                from_email: from,
                body_text: text,
                created_at: new Date(),
              }],
            });

            logger.info({ ticketId: ticket._id, from }, 'Created WhatsApp support ticket');
          } else {
            // Append conversation
            await SupportTicket.findByIdAndUpdate(ticket._id, {
              $push: {
                conversations: {
                  type: 'reply',
                  direction: 'inbound',
                  channel: 'whatsapp',
                  from_email: from,
                  body_text: text,
                  created_at: new Date(),
                },
              },
            });

            logger.info({ ticketId: ticket._id, from }, 'Appended WhatsApp message to ticket');
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error processing WhatsApp webhook');
  }
}));

export default router;

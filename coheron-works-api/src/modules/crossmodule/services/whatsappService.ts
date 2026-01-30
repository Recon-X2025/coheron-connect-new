import axios from 'axios';
import logger from '../../../shared/utils/logger.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

let instance: WhatsAppService | null = null;

class WhatsAppService {
  private token: string;
  private phoneNumberId: string;

  constructor() {
    this.token = process.env.WHATSAPP_API_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  isEnabled(): boolean {
    return process.env.WHATSAPP_ENABLED === 'true' && !!this.token && !!this.phoneNumberId;
  }

  async sendTextMessage(to: string, body: string): Promise<any> {
    if (!this.isEnabled()) {
      logger.info({ to }, 'WhatsApp disabled, skipping message');
      return null;
    }

    const url = `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`;
    const res = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      },
      { headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } }
    );
    logger.info({ to, messageId: res.data?.messages?.[0]?.id }, 'WhatsApp text message sent');
    return res.data;
  }

  async sendTemplateMessage(to: string, template: string, params: string[]): Promise<any> {
    if (!this.isEnabled()) {
      logger.info({ to, template }, 'WhatsApp disabled, skipping template message');
      return null;
    }

    const url = `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`;
    const res = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: 'en' },
          components: params.length > 0
            ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }]
            : [],
        },
      },
      { headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } }
    );
    logger.info({ to, template, messageId: res.data?.messages?.[0]?.id }, 'WhatsApp template message sent');
    return res.data;
  }
}

export function getWhatsAppService(): WhatsAppService {
  if (!instance) instance = new WhatsAppService();
  return instance;
}

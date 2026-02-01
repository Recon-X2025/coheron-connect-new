import axios from 'axios';
import MessagingIntegration, { IMessagingIntegration } from '../models/MessagingIntegration.js';
import MessagingNotificationLog from '../models/MessagingNotificationLog.js';
import logger from '../shared/utils/logger.js';

interface NotificationField { label: string; value: string; }
interface NotificationAction { text: string; url: string; }
interface NotificationData {
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  fields?: NotificationField[];
  actions?: NotificationAction[];
}

class MessagingService {
  async sendNotification(tenantId: string, eventType: string, data: NotificationData): Promise<void> {
    const integrations = await MessagingIntegration.find({
      tenant_id: tenantId,
      is_active: true,
    });

    for (const integration of integrations) {
      const channels = integration.notification_channels.filter((ch : any) =>
        ch.events.includes(eventType)
      );
      for (const ch of channels) {
        try {
          if (integration.platform === 'slack') {
            const blocks = this.formatSlackMessage(data);
            await this.sendSlack(integration.config.bot_token!, ch.channel_id, blocks);
            await this.logNotification(tenantId, 'slack', ch.channel_id, eventType, data.message, blocks, 'sent', undefined, data.entity_type, data.entity_id);
          } else if (integration.platform === 'teams') {
            const card = this.formatTeamsMessage(data);
            await this.sendTeams(integration.config.webhook_url!, card);
            await this.logNotification(tenantId, 'teams', ch.channel_id, eventType, data.message, card, 'sent', undefined, data.entity_type, data.entity_id);
          }
        } catch (err: any) {
          logger.error(`Messaging send failed: ${err.message}`);
          await this.logNotification(tenantId, integration.platform, ch.channel_id, eventType, data.message, null, 'failed', err.message, data.entity_type, data.entity_id);
        }
      }
    }
  }

  formatSlackMessage(data: NotificationData): any[] {
    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: data.title } },
      { type: 'section', text: { type: 'mrkdwn', text: data.message } },
    ];
    if (data.fields && data.fields.length > 0) {
      blocks.push({
        type: 'section',
        fields: data.fields.map((f: NotificationField) => ({
          type: 'mrkdwn',
          text: `*${f.label}**\n${f.value}`,
        })),
      });
    }
    if (data.actions && data.actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: data.actions.map((a: NotificationAction) => ({
          type: 'button',
          text: { type: 'plain_text', text: a.text },
          url: a.url,
        })),
      });
    }
    return blocks;
  }

  formatTeamsMessage(data: NotificationData): any {
    const body: any[] = [
      { type: 'TextBlock', text: data.title, size: 'Large', weight: 'Bolder' },
      { type: 'TextBlock', text: data.message, wrap: true },
    ];
    if (data.fields && data.fields.length > 0) {
      body.push({
        type: 'FactSet',
        facts: data.fields.map((f: NotificationField) => ({ title: f.label, value: f.value })),
      });
    }
    const actions: any[] = [];
    if (data.actions && data.actions.length > 0) {
      for (const a of data.actions) {
        actions.push({ type: 'Action.OpenUrl', title: a.text, url: a.url });
      }
    }
    return {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: { type: 'AdaptiveCard', '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json', version: '1.4', body, actions },
      }],
    };
  }

  async sendSlack(botToken: string, channelId: string, blocks: any[]): Promise<void> {
    await axios.post('https://slack.com/api/chat.postMessage', {
      channel: channelId,
      blocks,
    }, {
      headers: { Authorization: `Bearer ${botToken}` },
    });
  }

  async sendTeams(webhookUrl: string, card: any): Promise<void> {
    await axios.post(webhookUrl, card);
  }

  async handleSlackInteraction(payload: any): Promise<any> {
    const action = payload.actions?.[0];
    if (!action) return { text: 'No action found' };
    logger.info(`Slack interaction: ${action.action_id} by ${payload.user?.id}`);
    return { text: `Action ${action.action_id} received` };
  }

  async handleTeamsInteraction(payload: any): Promise<any> {
    logger.info(`Teams action received: ${JSON.stringify(payload).substring(0, 100)}`);
    return { statusCode: 200 };
  }

  async processSlashCommand(platform: string, command: string, args: string, userId: string, tenantId: string): Promise<any> {
    const cmd = args.trim().toLowerCase();
    if (cmd.startsWith('sales summary')) {
      return { text: 'Sales summary: Fetching latest data...' };
    }
    if (cmd.startsWith('create lead')) {
      return { text: 'Lead creation initiated. Please provide details.' };
    }
    if (cmd.startsWith('my approvals')) {
      return { text: 'Fetching your pending approvals...' };
    }
    if (cmd.startsWith('stock check')) {
      return { text: 'Checking stock levels...' };
    }
    return {
      text: 'Available commands:\n- sales summary\n- create lead\n- my approvals\n- stock check <sku>\n- help',
    };
  }

  private async logNotification(
    tenantId: string, platform: string, channelId: string,
    eventType: string, messageText: string, blocks: any,
    status: string, errorMessage?: string,
    entityType?: string, entityId?: string
  ): Promise<void> {
    await MessagingNotificationLog.create({
      tenant_id: tenantId, platform, channel_id: channelId,
      event_type: eventType, message_text: messageText, blocks,
      status, error_message: errorMessage,
      entity_type: entityType, entity_id: entityId,
      sent_at: status === 'sent' ? new Date() : undefined,
    });
  }
}

export const messagingService = new MessagingService();
export default messagingService;

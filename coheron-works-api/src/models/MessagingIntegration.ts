import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationChannel {
  channel_id: string;
  channel_name: string;
  events: string[];
}
export interface IMessagingConfig {
  bot_token?: string;
  signing_secret?: string;
  app_id?: string;
  team_id?: string;
  tenant_id_ms?: string;
  webhook_url?: string;
  client_id?: string;
  client_secret?: string;
}

export interface IMessagingIntegration extends Document {
  tenant_id: string;
  platform: 'slack' | 'teams' | 'discord';
  name: string;
  is_active: boolean;
  config: IMessagingConfig;
  notification_channels: INotificationChannel[];
  slash_commands_enabled: boolean;
  approval_buttons_enabled: boolean;
  copilot_enabled: boolean;
  installed_by: mongoose.Types.ObjectId;
  installed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export const MESSAGING_EVENT_TYPES = [
  'order_confirmed', 'invoice_created', 'payment_received', 'sla_breach',
  'approval_request', 'low_stock', 'lead_created', 'ticket_created',
  'deployment', 'custom',
] as const;

export type MessagingEventType = (typeof MESSAGING_EVENT_TYPES)[number];

const NotificationChannelSchema = new Schema<INotificationChannel>({
  channel_id: { type: String, required: true },
  channel_name: { type: String, required: true },
  events: [{ type: String, enum: MESSAGING_EVENT_TYPES }],
}, { _id: false });

const MessagingIntegrationSchema = new Schema<IMessagingIntegration>({
  tenant_id: { type: String, required: true },
  platform: { type: String, required: true, enum: ['slack', 'teams', 'discord'] },
  name: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  config: {
    bot_token: { type: String },
    signing_secret: { type: String },
    app_id: { type: String },
    team_id: { type: String },
    tenant_id_ms: { type: String },
    webhook_url: { type: String },
    client_id: { type: String },
    client_secret: { type: String },
  },
  notification_channels: [NotificationChannelSchema],
  slash_commands_enabled: { type: Boolean, default: false },
  approval_buttons_enabled: { type: Boolean, default: false },
  copilot_enabled: { type: Boolean, default: false },
  installed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  installed_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

MessagingIntegrationSchema.index({ tenant_id: 1, platform: 1 }, { unique: true });

export default mongoose.models.MessagingIntegration as mongoose.Model<IMessagingIntegration> || mongoose.model<IMessagingIntegration>('MessagingIntegration', MessagingIntegrationSchema);

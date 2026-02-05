import mongoose, { Schema, Document } from 'mongoose';

export interface IMessagingNotificationLog extends Document {
  tenant_id: string;
  platform: string;
  channel_id: string;
  event_type: string;
  message_text: string;
  blocks: any;
  status: 'queued' | 'sent' | 'failed';
  error_message?: string;
  entity_type?: string;
  entity_id?: string;
  sent_at?: Date;
  created_at: Date;
}

const MNLSchema = new Schema<IMessagingNotificationLog>({
  tenant_id: { type: String, required: true },
  platform: { type: String, required: true },
  channel_id: { type: String, required: true },
  event_type: { type: String, required: true },
  message_text: { type: String },
  blocks: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
  error_message: { type: String },
  entity_type: { type: String },
  entity_id: { type: String },
  sent_at: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
MNLSchema.index({ tenant_id: 1, platform: 1, sent_at: -1 });
MNLSchema.index({ tenant_id: 1, entity_type: 1, entity_id: 1 });

export default mongoose.models.MessagingNotificationLog as mongoose.Model<IMessagingNotificationLog> || mongoose.model<IMessagingNotificationLog>('MessagingNotificationLog', MNLSchema);

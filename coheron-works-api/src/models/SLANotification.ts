import mongoose, { Schema, Document } from 'mongoose';

export interface ISLANotification extends Document {
  tenant_id: string;
  ticket_id: mongoose.Types.ObjectId;
  sla_policy_id: mongoose.Types.ObjectId;
  notification_type: 'warning' | 'breach' | 'escalation';
  threshold_minutes: number;
  actual_minutes: number;
  notified_users: mongoose.Types.ObjectId[];
  sent_at: Date;
  channel: 'email' | 'in_app' | 'both';
  created_at: Date;
}

const SLANotificationSchema = new Schema<ISLANotification>(
  {
    tenant_id: { type: String, required: true },
    ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    sla_policy_id: { type: Schema.Types.ObjectId, required: true },
    notification_type: { type: String, enum: ['warning', 'breach', 'escalation'], required: true },
    threshold_minutes: { type: Number, required: true },
    actual_minutes: { type: Number, required: true },
    notified_users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sent_at: { type: Date, required: true, default: Date.now },
    channel: { type: String, enum: ['email', 'in_app', 'both'], default: 'both' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

SLANotificationSchema.index({ tenant_id: 1, ticket_id: 1 });
SLANotificationSchema.index({ sent_at: 1 });

export default mongoose.models.SLANotification as mongoose.Model<ISLANotification> || mongoose.model<ISLANotification>('SLANotification', SLANotificationSchema);

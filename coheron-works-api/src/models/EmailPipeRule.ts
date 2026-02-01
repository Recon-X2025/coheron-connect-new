import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailPipeRule extends Document {
  tenant_id: string;
  name: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_password: string;
  is_ssl: boolean;
  poll_interval_minutes: number;
  auto_create_ticket: boolean;
  default_priority: string;
  default_team_id?: mongoose.Types.ObjectId;
  is_active: boolean;
  last_polled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const EmailPipeRuleSchema = new Schema<IEmailPipeRule>(
  {
    tenant_id: { type: String, required: true },
    name: { type: String, required: true },
    email_address: { type: String, required: true },
    imap_host: { type: String, required: true },
    imap_port: { type: Number, default: 993 },
    imap_user: { type: String, required: true },
    imap_password: { type: String, required: true },
    is_ssl: { type: Boolean, default: true },
    poll_interval_minutes: { type: Number, default: 5 },
    auto_create_ticket: { type: Boolean, default: true },
    default_priority: { type: String, default: 'medium' },
    default_team_id: { type: Schema.Types.ObjectId },
    is_active: { type: Boolean, default: true },
    last_polled_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

EmailPipeRuleSchema.index({ tenant_id: 1, email_address: 1 }, { unique: true });

export default mongoose.model<IEmailPipeRule>('EmailPipeRule', EmailPipeRuleSchema);

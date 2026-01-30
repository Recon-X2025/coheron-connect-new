import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ISupportTicket extends Document {
  ticket_number: string;
  subject: string;
  description: string;
  ticket_type: string;
  status: string;
  priority: string;
  channel_id: mongoose.Types.ObjectId;
  category_id: mongoose.Types.ObjectId;
  partner_id: mongoose.Types.ObjectId;
  contact_id: mongoose.Types.ObjectId;
  assigned_agent_id: mongoose.Types.ObjectId;
  assigned_team_id: mongoose.Types.ObjectId;
  sla_policy_id: mongoose.Types.ObjectId;
  parent_ticket_id: mongoose.Types.ObjectId;
  merged_from_ticket_id: mongoose.Types.ObjectId;
  source: string;
  tags: string[];
  custom_fields: any;
  is_public: boolean;
  is_sla_breached: boolean;
  sla_first_response_deadline: Date;
  sla_resolution_deadline: Date;
  first_response_at: Date;
  first_response_by: mongoose.Types.ObjectId;
  resolved_at: Date;
  resolved_by: mongoose.Types.ObjectId;
  closed_at: Date;
  closed_by: mongoose.Types.ObjectId;
}

const supportTicketSchema = new Schema({
  ticket_number: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  ticket_type: { type: String, default: 'issue' },
  status: { type: String, default: 'open' },
  priority: { type: String, default: 'medium' },
  channel_id: { type: Schema.Types.ObjectId, ref: 'TicketChannel' },
  category_id: { type: Schema.Types.ObjectId, ref: 'TicketCategory' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  contact_id: { type: Schema.Types.ObjectId },
  assigned_agent_id: { type: Schema.Types.ObjectId, ref: 'SupportAgent' },
  assigned_team_id: { type: Schema.Types.ObjectId, ref: 'SupportTeam' },
  sla_policy_id: { type: Schema.Types.ObjectId, ref: 'SlaPolicy' },
  parent_ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  merged_from_ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  source: { type: String },
  tags: [{ type: String }],
  custom_fields: { type: Schema.Types.Mixed },
  is_public: { type: Boolean, default: true },
  is_sla_breached: { type: Boolean, default: false },
  sla_first_response_deadline: { type: Date },
  sla_resolution_deadline: { type: Date },
  first_response_at: { type: Date },
  first_response_by: { type: Schema.Types.ObjectId },
  resolved_at: { type: Date },
  resolved_by: { type: Schema.Types.ObjectId },
  closed_at: { type: Date },
  closed_by: { type: Schema.Types.ObjectId },
}, schemaOptions);

supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ assigned_agent_id: 1 });
supportTicketSchema.index({ assigned_team_id: 1 });
supportTicketSchema.index({ partner_id: 1 });
supportTicketSchema.index({ status: 1, created_at: -1 });
supportTicketSchema.index({ partner_id: 1, created_at: -1 });

export const TicketNoteSchema = new Schema({
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
  note_type: { type: String, default: 'public' },
  content: { type: String, required: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  is_pinned: { type: Boolean, default: false },
}, schemaOptions);

TicketNoteSchema.index({ ticket_id: 1 });

export const TicketAttachmentSchema = new Schema({
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
  file_name: { type: String },
  file_url: { type: String },
  file_size: { type: Number },
  mime_type: { type: String },
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

TicketAttachmentSchema.index({ ticket_id: 1 });

export const TicketWatcherSchema = new Schema({
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, schemaOptions);
TicketWatcherSchema.index({ ticket_id: 1, user_id: 1 }, { unique: true });

export const TicketHistorySchema = new Schema({
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
  action: { type: String, required: true },
  old_value: { type: String },
  new_value: { type: String },
  performed_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

TicketHistorySchema.index({ ticket_id: 1 });

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
export const TicketNote = mongoose.model('TicketNote', TicketNoteSchema);
export const TicketAttachment = mongoose.model('TicketAttachment', TicketAttachmentSchema);
export const TicketWatcher = mongoose.model('TicketWatcher', TicketWatcherSchema);
export const TicketHistory = mongoose.model('TicketHistory', TicketHistorySchema);

export default SupportTicket;

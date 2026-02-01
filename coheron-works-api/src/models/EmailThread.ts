import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};


const participantSchema = new Schema({
  email: { type: String, required: true },
  name: { type: String },
  type: { type: String, enum: ["from", "to", "cc", "bcc"], required: true }
}, { _id: false });

const attachmentSchema = new Schema({
  filename: { type: String, required: true },
  size: { type: Number },
  content_type: { type: String },
  url: { type: String }
}, { _id: false });

const messageSchema = new Schema({
  message_id: { type: String },
  from_email: { type: String, required: true },
  from_name: { type: String },
  to_emails: [{ type: String }],
  cc_emails: [{ type: String }],
  subject: { type: String },
  body_html: { type: String },
  body_text: { type: String },
  sent_at: { type: Date, default: Date.now },
  direction: { type: String, enum: ["inbound", "outbound"], required: true },
  attachments: [attachmentSchema]
}, { _id: true });

const emailThreadSchema = new Schema({
  tenant_id: { type: String, required: true },
  subject: { type: String, required: true },
  participants: [participantSchema],
  related_type: { type: String, enum: ["lead", "deal", "partner", "ticket"] },
  related_id: { type: Schema.Types.ObjectId },
  messages: [messageSchema],
  last_message_at: { type: Date, default: Date.now },
  message_count: { type: Number, default: 0 },
  is_archived: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: "User" },
}, schemaOptions);

emailThreadSchema.index({ tenant_id: 1, related_type: 1, related_id: 1 });
emailThreadSchema.index({ tenant_id: 1, last_message_at: -1 });

export interface IEmailThread extends Document {
  tenant_id: string;
  subject: string;
  participants: { email: string; name?: string; type: string }[];
  related_type?: string;
  related_id?: mongoose.Types.ObjectId;
  messages: any[];
  last_message_at: Date;
  message_count: number;
  is_archived: boolean;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export const EmailThread = mongoose.model<IEmailThread>("EmailThread", emailThreadSchema);

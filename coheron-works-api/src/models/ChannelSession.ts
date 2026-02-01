import mongoose, { Schema, Document } from 'mongoose';
const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IChannelSession extends Document {
  tenant_id: string;
  customer_id?: mongoose.Types.ObjectId;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  channels_used: Array<{
    channel: string; started_at: Date; ended_at?: Date;
    agent_id?: mongoose.Types.ObjectId;
  }>;
  current_channel?: string;
  current_agent_id?: mongoose.Types.ObjectId;
  status: string;
  context?: any;
  ticket_id?: mongoose.Types.ObjectId;
  satisfaction_score?: number;
  satisfaction_feedback?: string;
  started_at: Date;
  ended_at?: Date;
  created_at: Date;
}

const ChannelUsedSchema = new Schema({
  channel: { type: String, enum: ['email','chat','voice','whatsapp','social'], required: true },
  started_at: { type: Date, required: true },
  ended_at: { type: Date },
  agent_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
}, { _id: false });

const ChannelSessionSchema = new Schema<IChannelSession>({
  tenant_id: { type: String, required: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  customer_email: { type: String },
  customer_phone: { type: String },
  customer_name: { type: String },
  channels_used: [ChannelUsedSchema],
  current_channel: { type: String, enum: ['email','chat','voice','whatsapp','social'] },
  current_agent_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  status: { type: String, enum: ['active','waiting','resolved','abandoned'], default: "active" },
  context: { type: Schema.Types.Mixed },
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  satisfaction_score: { type: Number },
  satisfaction_feedback: { type: String },
  started_at: { type: Date, required: true },
  ended_at: { type: Date },
}, schemaOptions);

ChannelSessionSchema.index({ tenant_id: 1, status: 1, started_at: -1 });
ChannelSessionSchema.index({ tenant_id: 1, current_agent_id: 1 });

export const ChannelSession = mongoose.model<IChannelSession>('ChannelSession', ChannelSessionSchema);

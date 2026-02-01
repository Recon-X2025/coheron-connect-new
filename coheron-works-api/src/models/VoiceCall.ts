import mongoose, { Schema, Document } from 'mongoose';
const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IVoiceCall extends Document {
  tenant_id: string;
  call_id: string;
  direction: string;
  from_number: string;
  to_number: string;
  agent_id: mongoose.Types.ObjectId;
  ticket_id?: mongoose.Types.ObjectId;
  channel_session_id?: mongoose.Types.ObjectId;
  status: string;
  started_at: Date;
  answered_at?: Date;
  ended_at?: Date;
  duration_seconds?: number;
  recording_url?: string;
  transcription_text?: string;
  transcription_summary?: string;
  sentiment?: string;
  intent_detected?: string;
  voicemail_url?: string;
  notes?: string;
  created_at: Date;
}

const VoiceCallSchema = new Schema<IVoiceCall>({
  tenant_id: { type: String, required: true },
  call_id: { type: String, required: true },
  from_number: { type: String, required: true },
  to_number: { type: String, required: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  agent_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  channel_session_id: { type: Schema.Types.ObjectId, ref: 'ChannelSession' },
  status: { type: String, enum: ['ringing','in_progress','on_hold','completed','missed','voicemail'], default: "ringing" },
  started_at: { type: Date, required: true },
  answered_at: { type: Date },
  ended_at: { type: Date },
  duration_seconds: { type: Number },
  recording_url: { type: String },
  transcription_text: { type: String },
  transcription_summary: { type: String },
  intent_detected: { type: String },
  voicemail_url: { type: String },
  notes: { type: String },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
}, schemaOptions);

VoiceCallSchema.index({ tenant_id: 1, agent_id: 1, started_at: -1 });
VoiceCallSchema.index({ tenant_id: 1, ticket_id: 1 });
VoiceCallSchema.index({ tenant_id: 1, status: 1 });

export const VoiceCall = mongoose.model<IVoiceCall>('VoiceCall', VoiceCallSchema);

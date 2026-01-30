import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IChatSession extends Document {
  session_id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  partner_id: mongoose.Types.ObjectId;
  assigned_agent_id: mongoose.Types.ObjectId;
  channel: string;
  status: string;
  ended_at: Date;
}

const chatSessionSchema = new Schema({
  session_id: { type: String, required: true, unique: true },
  visitor_name: { type: String },
  visitor_email: { type: String },
  visitor_phone: { type: String },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  assigned_agent_id: { type: Schema.Types.ObjectId, ref: 'SupportAgent' },
  channel: { type: String, default: 'web' },
  status: { type: String, default: 'waiting' },
  ended_at: { type: Date },
}, schemaOptions);

export interface IChatMessage extends Document {
  session_id: string;
  message_type: string;
  content: string;
  sender_id: mongoose.Types.ObjectId;
}

const chatMessageSchema = new Schema({
  session_id: { type: String, required: true },
  message_type: { type: String, default: 'user' },
  content: { type: String, required: true },
  sender_id: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

// ChatSession indexes (session_id already has unique: true)
chatSessionSchema.index({ partner_id: 1 });
chatSessionSchema.index({ assigned_agent_id: 1 });
chatSessionSchema.index({ status: 1 });
chatSessionSchema.index({ channel: 1 });
chatSessionSchema.index({ assigned_agent_id: 1, status: 1 });

// ChatMessage indexes
chatMessageSchema.index({ session_id: 1 });
chatMessageSchema.index({ sender_id: 1 });
chatMessageSchema.index({ session_id: 1, created_at: -1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);

export default ChatMessage;

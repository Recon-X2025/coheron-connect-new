import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

// ============================================
// Chat Widget Configuration
// ============================================
const chatWidgetConfigSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  widget_name: { type: String, default: 'Support Chat' },
  greeting_message: { type: String, default: 'Hi! How can we help you?' },
  offline_message: { type: String, default: 'We are currently offline. Please leave a message.' },
  theme_color: { type: String, default: '#4F46E5' },
  position: { type: String, enum: ['bottom_right', 'bottom_left'], default: 'bottom_right' },
  allowed_domains: [{ type: String }],
  business_hours: [{
    day: { type: Number, min: 0, max: 6 },
    start_time: { type: String },
    end_time: { type: String },
    is_open: { type: Boolean, default: true },
  }],
  auto_assign: { type: Boolean, default: true },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

chatWidgetConfigSchema.index({ tenant_id: 1 });

// ============================================
// Chat Session
// ============================================
const chatSessionSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  visitor_id: { type: String },
  visitor_name: { type: String },
  visitor_email: { type: String },
  visitor_phone: { type: String },
  agent_id: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['waiting', 'active', 'resolved', 'missed', 'closed'], default: 'waiting' },
  channel: { type: String, enum: ['widget', 'whatsapp', 'facebook', 'instagram'], default: 'widget' },
  started_at: { type: Date, default: Date.now },
  ended_at: { type: Date },
  first_response_at: { type: Date },
  wait_time_seconds: { type: Number },
  duration_seconds: { type: Number },
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
  tags: [{ type: String }],
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  metadata: { type: Schema.Types.Mixed },
}, schemaOptions);

chatSessionSchema.index({ tenant_id: 1, status: 1 });
chatSessionSchema.index({ tenant_id: 1, agent_id: 1 });
chatSessionSchema.index({ tenant_id: 1, created_at: -1 });
chatSessionSchema.index({ visitor_email: 1 });

// ============================================
// Chat Message
// ============================================
const chatMessageSchema = new Schema({
  session_id: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  sender_type: { type: String, enum: ['visitor', 'agent', 'bot', 'system'], required: true },
  sender_id: { type: String },
  message_type: { type: String, enum: ['text', 'image', 'file', 'system', 'canned_response'], default: 'text' },
  content: { type: String },
  attachments: [{
    file_name: { type: String },
    file_url: { type: String },
    file_size: { type: Number },
    mime_type: { type: String },
  }],
  is_read: { type: Boolean, default: false },
  read_at: { type: Date },
}, schemaOptions);

chatMessageSchema.index({ session_id: 1, created_at: 1 });

export const ChatWidgetConfig = mongoose.model('ChatWidgetConfig', chatWidgetConfigSchema);
export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

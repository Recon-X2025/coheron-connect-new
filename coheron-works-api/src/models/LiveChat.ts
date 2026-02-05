import mongoose, { Schema } from 'mongoose';

// Re-export ChatSession and ChatMessage from canonical source
export { ChatSession, ChatMessage } from './ChatMessage.js';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

// ============================================
// Chat Widget Configuration (unique to LiveChat)
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

export const ChatWidgetConfig = mongoose.models.ChatWidgetConfig || mongoose.model('ChatWidgetConfig', chatWidgetConfigSchema);

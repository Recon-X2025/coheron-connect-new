import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const portalUserSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  contact_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  email: { type: String, required: true },
  password_hash: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'pending_verification'], default: 'pending_verification' },
  verified: { type: Boolean, default: false },
  verified_at: { type: Date },
  verification_token: { type: String },
  verification_token_expires: { type: Date },
  reset_token: { type: String },
  reset_token_expires: { type: Date },
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    email_notifications: { type: Boolean, default: true },
    sms_notifications: { type: Boolean, default: false },
  },
  last_login: { type: Date },
  login_count: { type: Number, default: 0 },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

portalUserSchema.index({ tenant_id: 1, email: 1 }, { unique: true });

const portalSettingsSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, unique: true },
  branding: {
    logo_url: { type: String },
    primary_color: { type: String, default: '#3b82f6' },
    secondary_color: { type: String, default: '#1e40af' },
    company_name: { type: String },
    support_email: { type: String },
    support_phone: { type: String },
  },
  features: {
    tickets: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    invoices: { type: Boolean, default: true },
    quotes: { type: Boolean, default: true },
    knowledge_base: { type: Boolean, default: true },
    live_chat: { type: Boolean, default: true },
    projects: { type: Boolean, default: false },
  },
  registration: {
    enabled: { type: Boolean, default: true },
    require_approval: { type: Boolean, default: false },
    allowed_domains: [{ type: String }],
  },
  welcome_message: { type: String, default: 'Welcome to our customer portal!' },
  terms_url: { type: String },
  privacy_url: { type: String },
}, schemaOptions);

export const PortalUser = mongoose.models.PortalUser || mongoose.model('PortalUser', portalUserSchema);
export const PortalSettings = mongoose.models.PortalSettings || mongoose.model('PortalSettings', portalSettingsSchema);

import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};


const campaignAnalyticsSchema = new Schema({
  tenant_id: { type: String, required: true },
  campaign_id: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
  date: { type: Date, required: true },
  emails_sent: { type: Number, default: 0 },
  emails_delivered: { type: Number, default: 0 },
  emails_opened: { type: Number, default: 0 },
  emails_clicked: { type: Number, default: 0 },
  emails_bounced: { type: Number, default: 0 },
  emails_unsubscribed: { type: Number, default: 0 },
  sms_sent: { type: Number, default: 0 },
  sms_delivered: { type: Number, default: 0 },
  sms_failed: { type: Number, default: 0 },
  whatsapp_sent: { type: Number, default: 0 },
  whatsapp_delivered: { type: Number, default: 0 },
  whatsapp_read: { type: Number, default: 0 },
  leads_generated: { type: Number, default: 0 },
  revenue_attributed: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  conversion_rate: { type: Number, default: 0 },
  open_rate: { type: Number, default: 0 },
  click_rate: { type: Number, default: 0 },
  bounce_rate: { type: Number, default: 0 },
  roi: { type: Number, default: 0 },
}, schemaOptions);

campaignAnalyticsSchema.index({ tenant_id: 1, campaign_id: 1, date: 1 }, { unique: true });

export interface ICampaignAnalytics extends Document {
  tenant_id: string;
  campaign_id: mongoose.Types.ObjectId;
  date: Date;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  emails_unsubscribed: number;
  sms_sent: number;
  sms_delivered: number;
  sms_failed: number;
  whatsapp_sent: number;
  whatsapp_delivered: number;
  whatsapp_read: number;
  leads_generated: number;
  revenue_attributed: number;
  cost: number;
  conversions: number;
  conversion_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  roi: number;
  created_at: Date;
}

export const CampaignAnalytics = mongoose.model<ICampaignAnalytics>("CampaignAnalytics", campaignAnalyticsSchema);

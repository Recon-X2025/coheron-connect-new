import mongoose, { Schema, Document } from 'mongoose';

export interface ITouchPoint extends Document {
  tenant_id: mongoose.Types.ObjectId;
  contact_id: mongoose.Types.ObjectId;
  lead_id?: mongoose.Types.ObjectId;
  channel: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  landing_page: string;
  event_type: 'page_view' | 'form_submit' | 'email_open' | 'email_click' | 'ad_click' | 'social_engagement' | 'webinar_attend';
  event_value: number;
  session_id: string;
  timestamp: Date;
  attributed_revenue: {
    model_id: mongoose.Types.ObjectId;
    amount: number;
  };
  created_at: Date;
  updated_at: Date;
}

const touchPointSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  contact_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  lead_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  channel: { type: String, default: '' },
  source: { type: String, default: '' },
  medium: { type: String, default: '' },
  campaign: { type: String, default: '' },
  content: { type: String, default: '' },
  landing_page: { type: String, default: '' },
  event_type: { type: String, enum: ['page_view', 'form_submit', 'email_open', 'email_click', 'ad_click', 'social_engagement', 'webinar_attend'], required: true },
  event_value: { type: Number, default: 0 },
  session_id: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  attributed_revenue: {
    model_id: { type: Schema.Types.ObjectId, ref: 'AttributionModel' },
    amount: { type: Number, default: 0 },
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

touchPointSchema.index({ tenant_id: 1, contact_id: 1, timestamp: -1 });
touchPointSchema.index({ tenant_id: 1, campaign: 1 });

export const TouchPoint = mongoose.model<ITouchPoint>('TouchPoint', touchPointSchema);

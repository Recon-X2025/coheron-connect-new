import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ITicketSentiment extends Document {
  tenant_id: mongoose.Types.ObjectId;
  ticket_id: mongoose.Types.ObjectId;
  messages_analyzed: number;
  overall_sentiment: string;
  sentiment_score: number;
  escalation_risk: string;
  predicted_csat: number;
  risk_factors: string[];
  analyzed_at: Date;
}

const ticketSentimentSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  ticket_id: { type: Schema.Types.ObjectId, required: true },
  messages_analyzed: { type: Number, default: 0 },
  overall_sentiment: { type: String, enum: ['positive', 'neutral', 'negative', 'frustrated'], default: 'neutral' },
  sentiment_score: { type: Number, min: -1, max: 1, default: 0 },
  escalation_risk: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  predicted_csat: { type: Number, min: 1, max: 5, default: 3 },
  risk_factors: [{ type: String }],
  analyzed_at: { type: Date, default: Date.now },
}, defaultSchemaOptions);

ticketSentimentSchema.index({ tenant_id: 1, ticket_id: 1 }, { unique: true });
ticketSentimentSchema.index({ tenant_id: 1, escalation_risk: 1 });
ticketSentimentSchema.index({ tenant_id: 1, overall_sentiment: 1 });

export const TicketSentiment = mongoose.model<ITicketSentiment>('TicketSentiment', ticketSentimentSchema);
export default TicketSentiment;

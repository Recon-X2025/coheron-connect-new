import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketType {
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

export interface ISession {
  title: string;
  speaker_name: string;
  start_time: Date;
  end_time: Date;
  room?: string;
}

export interface ISponsor {
  name: string;
  tier: string;
  logo_url?: string;
  website?: string;
}

export interface IMarketingEvent extends Document {
  tenant_id: mongoose.Types.ObjectId;
  event_name: string;
  event_type: 'conference' | 'webinar' | 'workshop' | 'meetup' | 'tradeshow';
  description: string;
  venue?: string;
  platform_url?: string;
  start_date: Date;
  end_date: Date;
  max_attendees: number;
  registration_open: boolean;
  ticket_types: ITicketType[];
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  banner_url?: string;
  organizer_id: mongoose.Types.ObjectId;
  tags: string[];
  sessions: ISession[];
  sponsors: ISponsor[];
  created_at: Date;
  updated_at: Date;
}

const ticketTypeSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  sold: { type: Number, default: 0 },
}, { _id: false });

const sessionInlineSchema = new Schema({
  title: { type: String, required: true },
  speaker_name: { type: String },
  start_time: { type: Date },
  end_time: { type: Date },
  room: { type: String },
}, { _id: false });

const sponsorSchema = new Schema({
  name: { type: String, required: true },
  tier: { type: String, default: 'standard' },
  logo_url: { type: String },
  website: { type: String },
}, { _id: false });

const marketingEventSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  event_name: { type: String, required: true },
  event_type: { type: String, enum: ['conference', 'webinar', 'workshop', 'meetup', 'tradeshow'], required: true },
  description: { type: String, default: '' },
  venue: { type: String },
  platform_url: { type: String },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  max_attendees: { type: Number, default: 100 },
  registration_open: { type: Boolean, default: false },
  ticket_types: [ticketTypeSchema],
  status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'], default: 'draft' },
  banner_url: { type: String },
  organizer_id: { type: Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String }],
  sessions: [sessionInlineSchema],
  sponsors: [sponsorSchema],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

marketingEventSchema.index({ tenant_id: 1, status: 1 });
marketingEventSchema.index({ tenant_id: 1, start_date: 1 });

export const MarketingEvent = mongoose.model<IMarketingEvent>('MarketingEvent', marketingEventSchema);

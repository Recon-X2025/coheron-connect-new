import mongoose, { Schema, Document } from 'mongoose';

export interface IEventRegistration extends Document {
  tenant_id: mongoose.Types.ObjectId;
  event_id: mongoose.Types.ObjectId;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  company?: string;
  ticket_type: string;
  payment_status: 'pending' | 'paid' | 'refunded' | 'free';
  check_in_status: 'not_checked_in' | 'checked_in';
  check_in_time?: Date;
  registration_date: Date;
  custom_fields: Map<string, any>;
  created_at: Date;
}

const eventRegistrationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  event_id: { type: Schema.Types.ObjectId, ref: 'MarketingEvent', required: true, index: true },
  attendee_name: { type: String, required: true },
  attendee_email: { type: String, required: true },
  attendee_phone: { type: String },
  company: { type: String },
  ticket_type: { type: String, required: true },
  payment_status: { type: String, enum: ['pending', 'paid', 'refunded', 'free'], default: 'pending' },
  check_in_status: { type: String, enum: ['not_checked_in', 'checked_in'], default: 'not_checked_in' },
  check_in_time: { type: Date },
  registration_date: { type: Date, default: Date.now },
  custom_fields: { type: Map, of: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

eventRegistrationSchema.index({ tenant_id: 1, event_id: 1, attendee_email: 1 }, { unique: true });
eventRegistrationSchema.index({ event_id: 1, check_in_status: 1 });

export const EventRegistration = mongoose.model<IEventRegistration>('EventRegistration', eventRegistrationSchema);

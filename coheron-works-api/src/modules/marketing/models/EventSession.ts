import mongoose, { Schema, Document } from 'mongoose';

export interface IEventSession extends Document {
  tenant_id: mongoose.Types.ObjectId;
  event_id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  speaker_name: string;
  speaker_bio?: string;
  start_time: Date;
  end_time: Date;
  room?: string;
  track?: string;
  max_attendees: number;
  registered_count: number;
  materials_url?: string;
  recording_url?: string;
  created_at: Date;
  updated_at: Date;
}

const eventSessionSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  event_id: { type: Schema.Types.ObjectId, ref: 'MarketingEvent', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  speaker_name: { type: String, required: true },
  speaker_bio: { type: String },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  room: { type: String },
  track: { type: String },
  max_attendees: { type: Number, default: 50 },
  registered_count: { type: Number, default: 0 },
  materials_url: { type: String },
  recording_url: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

eventSessionSchema.index({ event_id: 1, start_time: 1 });

export const EventSession = mongoose.model<IEventSession>('EventSession', eventSessionSchema);

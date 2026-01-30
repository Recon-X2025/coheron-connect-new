import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ITicketChannel extends Document {
  name: string;
  channel_type: string;
  is_active: boolean;
}

const ticketChannelSchema = new Schema({
  name: { type: String, required: true },
  channel_type: { type: String, required: true },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

// Indexes
ticketChannelSchema.index({ channel_type: 1 });
ticketChannelSchema.index({ is_active: 1 });

const TicketChannel = mongoose.model<ITicketChannel>('TicketChannel', ticketChannelSchema);
export default TicketChannel;

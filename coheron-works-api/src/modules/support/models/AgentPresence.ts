import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IAgentPresence extends Document {
  tenant_id: mongoose.Types.ObjectId;
  agent_id: mongoose.Types.ObjectId;
  status: string;
  currently_viewing_ticket_id?: mongoose.Types.ObjectId;
  last_active_at: Date;
  active_tickets: mongoose.Types.ObjectId[];
  capacity_limit: number;
  current_load: number;
}

const agentPresenceSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  agent_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['online', 'away', 'busy', 'offline'], default: 'offline' },
  currently_viewing_ticket_id: { type: Schema.Types.ObjectId },
  last_active_at: { type: Date, default: Date.now },
  active_tickets: [{ type: Schema.Types.ObjectId }],
  capacity_limit: { type: Number, default: 10 },
  current_load: { type: Number, default: 0 },
}, defaultSchemaOptions);

agentPresenceSchema.index({ tenant_id: 1, agent_id: 1 }, { unique: true });
agentPresenceSchema.index({ tenant_id: 1, status: 1 });
agentPresenceSchema.index({ tenant_id: 1, currently_viewing_ticket_id: 1 });

export const AgentPresence = mongoose.model<IAgentPresence>('AgentPresence', agentPresenceSchema);
export default AgentPresence;

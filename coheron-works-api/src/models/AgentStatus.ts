import mongoose, { Schema, Document } from 'mongoose';
const schemaOptions = {
  timestamps: { createdAt: false, updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAgentStatus extends Document {
  tenant_id: string;
  agent_id: mongoose.Types.ObjectId;
  status: string;
  current_channel_sessions: mongoose.Types.ObjectId[];
  max_concurrent_sessions: number;
  skills: string[];
  languages: string[];
  shift_start?: Date;
  shift_end?: Date;
  break_start?: Date;
  break_end?: Date;
  total_handled_today: number;
  avg_handle_time_today: number;
  csat_today: number;
  last_activity_at?: Date;
  updated_at: Date;
}

const AgentStatusSchema = new Schema<IAgentStatus>({
  tenant_id: { type: String, required: true },
  agent_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  status: { type: String, enum: ['available','busy','away','offline','on_call','in_meeting'], default: "offline" },
  current_channel_sessions: [{ type: Schema.Types.ObjectId, ref: 'ChannelSession' }],
  max_concurrent_sessions: { type: Number, default: 5 },
  skills: [{ type: String }],
  languages: [{ type: String }],
  shift_start: { type: Date },
  shift_end: { type: Date },
  break_start: { type: Date },
  break_end: { type: Date },
  total_handled_today: { type: Number, default: 0 },
  avg_handle_time_today: { type: Number, default: 0 },
  csat_today: { type: Number, default: 0 },
  last_activity_at: { type: Date },
}, schemaOptions);

AgentStatusSchema.index({ tenant_id: 1, status: 1 });
AgentStatusSchema.index({ tenant_id: 1, agent_id: 1 }, { unique: true });

export const AgentStatus = mongoose.model<IAgentStatus>('AgentStatus', AgentStatusSchema);

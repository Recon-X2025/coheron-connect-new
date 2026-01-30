import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ISupportTeam extends Document {
  name: string;
  description: string;
  email: string;
  is_active: boolean;
}

const supportTeamSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  email: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

export interface ISupportAgent extends Document {
  user_id: mongoose.Types.ObjectId;
  team_id: mongoose.Types.ObjectId;
  agent_type: string;
  max_tickets: number;
  skills: string[];
  is_active: boolean;
}

const supportAgentSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  team_id: { type: Schema.Types.ObjectId, ref: 'SupportTeam' },
  agent_type: { type: String, default: 'agent' },
  max_tickets: { type: Number, default: 10 },
  skills: [{ type: String }],
  is_active: { type: Boolean, default: true },
}, schemaOptions);

// SupportTeam indexes
supportTeamSchema.index({ is_active: 1 });

// SupportAgent indexes
supportAgentSchema.index({ user_id: 1 });
supportAgentSchema.index({ team_id: 1 });
supportAgentSchema.index({ is_active: 1 });
supportAgentSchema.index({ team_id: 1, is_active: 1 });

export const SupportTeam = mongoose.model<ISupportTeam>('SupportTeam', supportTeamSchema);
export const SupportAgent = mongoose.model<ISupportAgent>('SupportAgent', supportAgentSchema);

export default SupportTeam;

import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const journeyNodeSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['email', 'sms', 'whatsapp', 'wait', 'condition', 'split', 'action', 'goal'], required: true },
  position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  config: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const journeyConnectionSchema = new Schema({
  from_node_id: { type: String, required: true },
  to_node_id: { type: String, required: true },
  label: { type: String },
}, { _id: false });

const entryTriggerSchema = new Schema({
  type: { type: String, enum: ['form_submission', 'list_membership', 'tag_added', 'deal_stage_change', 'manual'], required: true },
  config: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });
const marketingJourneySchema = new Schema({
  tenant_id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ["draft", "active", "paused", "completed", "archived"], default: "draft" },
  entry_trigger: { type: entryTriggerSchema },
  nodes: [journeyNodeSchema],
  connections: [journeyConnectionSchema],
  enrollment_count: { type: Number, default: 0 },
  active_count: { type: Number, default: 0 },
  completed_count: { type: Number, default: 0 },
  goal_reached_count: { type: Number, default: 0 },
  conversion_rate: { type: Number, default: 0 },
  started_at: { type: Date },
  ended_at: { type: Date },
  created_by: { type: Schema.Types.ObjectId, ref: "User" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, schemaOptions);

marketingJourneySchema.index({ tenant_id: 1, status: 1 });
marketingJourneySchema.index({ tenant_id: 1, created_at: -1 });

export interface IMarketingJourney extends Document {
  tenant_id: string;
  name: string;
  description?: string;
  status: string;
  entry_trigger?: any;
  nodes: any[];
  connections: any[];
  enrollment_count: number;
  active_count: number;
  completed_count: number;
  goal_reached_count: number;
  conversion_rate: number;
  started_at?: Date;
  ended_at?: Date;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}
export const MarketingJourney = mongoose.model<IMarketingJourney>("MarketingJourney", marketingJourneySchema);

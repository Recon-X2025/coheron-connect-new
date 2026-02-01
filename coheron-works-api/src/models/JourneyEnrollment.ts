import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const nodeHistoryEntrySchema = new Schema({
  node_id: { type: String, required: true },
  entered_at: { type: Date, default: Date.now },
  exited_at: { type: Date },
  action_taken: { type: String },
  result: { type: Schema.Types.Mixed },
}, { _id: false });

const journeyEnrollmentSchema = new Schema({
  tenant_id: { type: String, required: true },
  journey_id: { type: Schema.Types.ObjectId, ref: "MarketingJourney", required: true },
  contact_id: { type: Schema.Types.ObjectId, required: true },
  contact_email: { type: String },
  current_node_id: { type: String },
  status: { type: String, enum: ["active", "completed", "exited", "goal_reached", "error"], default: "active" },
  entered_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  node_history: [nodeHistoryEntrySchema],
  created_at: { type: Date, default: Date.now },
}, schemaOptions);

journeyEnrollmentSchema.index({ tenant_id: 1, journey_id: 1, status: 1 });
journeyEnrollmentSchema.index({ tenant_id: 1, contact_id: 1 });

export interface IJourneyEnrollment extends Document {
  tenant_id: string;
  journey_id: mongoose.Types.ObjectId;
  contact_id: mongoose.Types.ObjectId;
  contact_email?: string;
  current_node_id?: string;
  status: string;
  entered_at: Date;
  completed_at?: Date;
  node_history: any[];
  created_at: Date;
}

export const JourneyEnrollment = mongoose.model<IJourneyEnrollment>("JourneyEnrollment", journeyEnrollmentSchema);

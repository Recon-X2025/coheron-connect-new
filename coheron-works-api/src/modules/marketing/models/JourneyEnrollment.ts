import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IJourneyEnrollment extends Document {
  tenant_id: string;
  journey_id: string;
  contact_id: string;
  status: 'active' | 'completed' | 'goal_achieved' | 'exited' | 'failed';
  current_node_id?: string;
  enrolled_at: Date;
  completed_at?: Date;
  node_history: Array<{ node_id: string; entered_at: Date; exited_at?: Date; result?: any }>;
}

const journeyEnrollmentSchema = new Schema<IJourneyEnrollment>({
  tenant_id: { type: String, required: true, index: true },
  journey_id: { type: String, required: true, index: true },
  contact_id: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'goal_achieved', 'exited', 'failed'], default: 'active' },
  current_node_id: String,
  enrolled_at: { type: Date, default: Date.now },
  completed_at: Date,
  node_history: [{
    node_id: String,
    entered_at: { type: Date, default: Date.now },
    exited_at: Date,
    result: Schema.Types.Mixed,
  }],
}, defaultSchemaOptions);

journeyEnrollmentSchema.index({ tenant_id: 1, journey_id: 1, contact_id: 1 });

export const JourneyEnrollment = (mongoose.models.JourneyEnrollment as mongoose.Model<IJourneyEnrollment>) || mongoose.model<IJourneyEnrollment>('JourneyEnrollment', journeyEnrollmentSchema);

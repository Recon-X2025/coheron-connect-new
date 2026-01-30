import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IVelocityData extends Document {
  project_id: mongoose.Types.ObjectId;
  sprint_id: mongoose.Types.ObjectId;
  completed_story_points: number;
  completed_issues: number;
  planned_story_points: number;
  planned_issues: number;
}

const velocityDataSchema = new Schema<IVelocityData>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  sprint_id: { type: Schema.Types.ObjectId, ref: 'Sprint', required: true, unique: true },
  completed_story_points: { type: Number, default: 0 },
  completed_issues: { type: Number, default: 0 },
  planned_story_points: { type: Number, default: 0 },
  planned_issues: { type: Number, default: 0 },
}, defaultSchemaOptions);

// VelocityData indexes (sprint_id already has unique: true)
velocityDataSchema.index({ project_id: 1 });

export default mongoose.model<IVelocityData>('VelocityData', velocityDataSchema);

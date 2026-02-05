import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ISprintBurndown extends Document {
  sprint_id: mongoose.Types.ObjectId;
  date: Date;
  remaining_story_points: number;
  remaining_tasks: number;
  completed_story_points: number;
  completed_tasks: number;
  created_at: Date;
  updated_at: Date;
}

const sprintBurndownSchema = new Schema<ISprintBurndown>({
  sprint_id: { type: Schema.Types.ObjectId, ref: 'Sprint', required: true },
  date: { type: Date, required: true },
  remaining_story_points: { type: Number, required: true },
  remaining_tasks: { type: Number, default: 0 },
  completed_story_points: { type: Number, default: 0 },
  completed_tasks: { type: Number, default: 0 },
}, defaultSchemaOptions);

sprintBurndownSchema.index({ sprint_id: 1, date: 1 }, { unique: true });
// Additional index for date-based queries
sprintBurndownSchema.index({ date: -1 });

export default mongoose.models.SprintBurndown as mongoose.Model<ISprintBurndown> || mongoose.model<ISprintBurndown>('SprintBurndown', sprintBurndownSchema);

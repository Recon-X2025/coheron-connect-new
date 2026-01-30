import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface ISprintIssue extends Document {
  sprint_id: mongoose.Types.ObjectId;
  issue_id: mongoose.Types.ObjectId;
  position: number;
}

const sprintIssueSchema = new Schema<ISprintIssue>({
  sprint_id: { type: Schema.Types.ObjectId, ref: 'Sprint', required: true },
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  position: { type: Number },
}, defaultSchemaOptions);

sprintIssueSchema.index({ sprint_id: 1, issue_id: 1 }, { unique: true });
// Additional single-field index for querying by issue
sprintIssueSchema.index({ issue_id: 1 });

export default mongoose.model<ISprintIssue>('SprintIssue', sprintIssueSchema);

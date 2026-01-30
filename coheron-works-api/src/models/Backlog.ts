import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IBacklog extends Document {
  project_id: mongoose.Types.ObjectId;
  issue_id: mongoose.Types.ObjectId;
  priority: number;
  rank: number;
}

const backlogSchema = new Schema<IBacklog>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  issue_id: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  priority: { type: Number, default: 0 },
  rank: { type: Number },
}, defaultSchemaOptions);

backlogSchema.index({ project_id: 1, issue_id: 1 }, { unique: true });
// Additional single-field index and sort index
backlogSchema.index({ issue_id: 1 });
backlogSchema.index({ project_id: 1, rank: 1 });

export default mongoose.model<IBacklog>('Backlog', backlogSchema);

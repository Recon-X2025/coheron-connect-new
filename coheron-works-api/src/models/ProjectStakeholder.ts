import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IProjectStakeholder extends Document {
  project_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role?: string;
  created_at: Date;
  updated_at: Date;
}

const projectStakeholderSchema = new Schema<IProjectStakeholder>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String },
}, defaultSchemaOptions);

projectStakeholderSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

// Indexes
projectStakeholderSchema.index({ user_id: 1 });
projectStakeholderSchema.index({ role: 1 });
projectStakeholderSchema.index({ created_at: -1 });

export default mongoose.model<IProjectStakeholder>('ProjectStakeholder', projectStakeholderSchema);

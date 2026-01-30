import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IRelease extends Document {
  project_id: mongoose.Types.ObjectId;
  name: string;
  version: string;
  release_date?: Date;
  status: string;
  release_notes?: string;
  created_at: Date;
  updated_at: Date;
}

const releaseSchema = new Schema<IRelease>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  version: { type: String, required: true },
  release_date: { type: Date },
  status: { type: String, default: 'planned' },
  release_notes: { type: String },
}, defaultSchemaOptions);

// Indexes
releaseSchema.index({ project_id: 1 });
releaseSchema.index({ status: 1 });
releaseSchema.index({ release_date: -1 });
releaseSchema.index({ project_id: 1, status: 1 });

export default mongoose.model<IRelease>('Release', releaseSchema);

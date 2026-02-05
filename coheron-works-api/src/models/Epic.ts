import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IEpic extends Document {
  project_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  status: string;
}

const epicSchema = new Schema<IEpic>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'open' },
}, defaultSchemaOptions);

// Indexes
epicSchema.index({ project_id: 1 });
epicSchema.index({ status: 1 });
epicSchema.index({ project_id: 1, status: 1 });

export default mongoose.models.Epic as mongoose.Model<IEpic> || mongoose.model<IEpic>('Epic', epicSchema);

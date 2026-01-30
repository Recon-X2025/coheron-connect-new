import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IQualityChecklist extends Document {
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  checklist_name: string;
  checklist_type: string;
  items: any[];
  status: string;
  completed_by?: mongoose.Types.ObjectId;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const qualityChecklistSchema = new Schema<IQualityChecklist>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
  checklist_name: { type: String, required: true },
  checklist_type: { type: String, default: 'qa' },
  items: [{ type: Schema.Types.Mixed }],
  status: { type: String, default: 'draft' },
  completed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  completed_at: { type: Date },
}, defaultSchemaOptions);

// Indexes
qualityChecklistSchema.index({ project_id: 1 });
qualityChecklistSchema.index({ task_id: 1 });
qualityChecklistSchema.index({ status: 1 });
qualityChecklistSchema.index({ completed_by: 1 });
qualityChecklistSchema.index({ project_id: 1, status: 1 });
qualityChecklistSchema.index({ created_at: -1 });

export default mongoose.model<IQualityChecklist>('QualityChecklist', qualityChecklistSchema);

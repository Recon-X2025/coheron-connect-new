import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ITaskChecklist extends Document {
  task_id: mongoose.Types.ObjectId;
  item_text: string;
  is_completed: boolean;
  completed_at?: Date;
  completed_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const taskChecklistSchema = new Schema<ITaskChecklist>({
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask', required: true },
  item_text: { type: String, required: true },
  is_completed: { type: Boolean, default: false },
  completed_at: { type: Date },
  completed_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

// Indexes
taskChecklistSchema.index({ task_id: 1 });
taskChecklistSchema.index({ is_completed: 1 });
taskChecklistSchema.index({ task_id: 1, is_completed: 1 });
taskChecklistSchema.index({ completed_by: 1 });
taskChecklistSchema.index({ created_at: -1 });

export default mongoose.model<ITaskChecklist>('TaskChecklist', taskChecklistSchema);

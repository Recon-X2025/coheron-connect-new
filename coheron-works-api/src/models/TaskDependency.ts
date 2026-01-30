import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ITaskDependency extends Document {
  task_id: mongoose.Types.ObjectId;
  depends_on_task_id: mongoose.Types.ObjectId;
  dependency_type: string;
  created_at: Date;
  updated_at: Date;
}

const taskDependencySchema = new Schema<ITaskDependency>({
  task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask', required: true },
  depends_on_task_id: { type: Schema.Types.ObjectId, ref: 'ProjectTask', required: true },
  dependency_type: { type: String, default: 'finish_to_start' },
}, defaultSchemaOptions);

taskDependencySchema.index({ task_id: 1, depends_on_task_id: 1 }, { unique: true });

// Indexes
taskDependencySchema.index({ depends_on_task_id: 1 });
taskDependencySchema.index({ dependency_type: 1 });
taskDependencySchema.index({ created_at: -1 });

export default mongoose.model<ITaskDependency>('TaskDependency', taskDependencySchema);

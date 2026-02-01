import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ILearningEnrollment extends Document {
  tenant_id: mongoose.Types.ObjectId;
  path_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progress_pct: number;
  started_at?: Date;
  completed_at?: Date;
  course_progress: {
    course_id: mongoose.Types.ObjectId;
    status: string;
    score: number;
    completed_at?: Date;
  }[];
  assigned_by?: mongoose.Types.ObjectId;
}

const learningEnrollmentSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  path_id: { type: Schema.Types.ObjectId, ref: 'LearningPath', required: true, index: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['enrolled', 'in_progress', 'completed', 'dropped'], default: 'enrolled' },
  progress_pct: { type: Number, default: 0 },
  started_at: Date,
  completed_at: Date,
  course_progress: [{
    course_id: { type: Schema.Types.ObjectId },
    status: { type: String, default: 'not_started' },
    score: { type: Number, default: 0 },
    completed_at: Date,
  }],
  assigned_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, defaultSchemaOptions);

learningEnrollmentSchema.index({ tenant_id: 1, employee_id: 1, path_id: 1 });

export const LearningEnrollment = mongoose.model<ILearningEnrollment>('LearningEnrollment', learningEnrollmentSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ILearningPath extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  courses: { course_id: mongoose.Types.ObjectId; order: number; is_required: boolean }[];
  estimated_hours: number;
  skills: string[];
  certification_id?: mongoose.Types.ObjectId;
  enrollment_count: number;
  completion_rate: number;
  created_by: mongoose.Types.ObjectId;
  is_published: boolean;
}

const learningPathSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  courses: [{
    course_id: { type: Schema.Types.ObjectId, ref: 'Course' },
    order: { type: Number, default: 0 },
    is_required: { type: Boolean, default: true },
  }],
  estimated_hours: { type: Number, default: 0 },
  skills: [{ type: String }],
  certification_id: { type: Schema.Types.ObjectId, ref: 'Certification' },
  enrollment_count: { type: Number, default: 0 },
  completion_rate: { type: Number, default: 0 },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  is_published: { type: Boolean, default: false },
}, defaultSchemaOptions);

learningPathSchema.index({ tenant_id: 1, is_published: 1 });

export const LearningPath = mongoose.model<ILearningPath>('LearningPath', learningPathSchema);

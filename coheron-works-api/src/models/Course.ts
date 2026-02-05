import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const courseSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  total_time: { type: Number },
  category: { type: String },
  instructor: { type: String },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

courseSchema.index({ category: 1 });
courseSchema.index({ is_active: 1 });

const courseEnrollmentSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, default: 'enrolled' },
  progress: { type: Number, default: 0 },
}, schemaOptions);

courseEnrollmentSchema.index({ employee_id: 1 });
courseEnrollmentSchema.index({ course_id: 1 });
courseEnrollmentSchema.index({ status: 1 });
courseEnrollmentSchema.index({ employee_id: 1, course_id: 1 });

export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
export const CourseEnrollment = mongoose.models.CourseEnrollment || mongoose.model('CourseEnrollment', courseEnrollmentSchema);

import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const attendanceSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  check_in: { type: String },
  check_out: { type: String },
  hours_worked: { type: Number },
  status: { type: String },
}, schemaOptions);

attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ employee_id: 1, status: 1 });

export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

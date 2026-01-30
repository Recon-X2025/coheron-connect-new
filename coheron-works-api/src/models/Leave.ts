import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const leaveRequestSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  leave_type: { type: String, required: true },
  from_date: { type: Date, required: true },
  to_date: { type: Date, required: true },
  days: { type: Number },
  reason: { type: String },
  contact_during_leave: { type: String },
  status: { type: String, default: 'pending' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'Employee' },
  approved_at: { type: Date },
}, schemaOptions);

leaveRequestSchema.index({ employee_id: 1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ leave_type: 1 });
leaveRequestSchema.index({ from_date: -1 });
leaveRequestSchema.index({ employee_id: 1, status: 1 });

const leaveBalanceSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  year: { type: Number, required: true },
  leave_type: { type: String },
  total: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },
}, schemaOptions);

leaveBalanceSchema.index({ employee_id: 1, year: 1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

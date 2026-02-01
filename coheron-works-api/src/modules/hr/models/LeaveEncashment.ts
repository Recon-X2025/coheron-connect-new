import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveEncashment extends Document {
  tenant_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  leave_type: string;
  encashment_type: 'encashment' | 'carry_forward';
  period_year: number;
  days_available: number;
  days_encashed: number;
  days_carried_forward: number;
  days_lapsed: number;
  encashment_amount: number;
  daily_rate: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'processed';
  approved_by?: mongoose.Types.ObjectId;
  processed_in_payroll_id?: mongoose.Types.ObjectId;
  remarks?: string;
  created_at: Date;
  updated_at: Date;
}

const leaveEncashmentSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  leave_type: { type: String, required: true },
  encashment_type: { type: String, enum: ['encashment', 'carry_forward'], required: true },
  period_year: { type: Number, required: true },
  days_available: { type: Number, required: true },
  days_encashed: { type: Number, default: 0 },
  days_carried_forward: { type: Number, default: 0 },
  days_lapsed: { type: Number, default: 0 },
  encashment_amount: { type: Number, default: 0 },
  daily_rate: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected', 'processed'], default: 'draft' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  processed_in_payroll_id: { type: Schema.Types.ObjectId },
  remarks: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

leaveEncashmentSchema.index({ tenant_id: 1, employee_id: 1, period_year: 1 });

export const LeaveEncashment = mongoose.model<ILeaveEncashment>('LeaveEncashment', leaveEncashmentSchema);

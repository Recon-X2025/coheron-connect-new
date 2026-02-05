import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ILeaveType extends Document {
  name: string;
  code: string;
  type: string;
  tenant_id: mongoose.Types.ObjectId;
}

const leaveTypeSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['earned', 'sick', 'casual', 'maternity', 'paternity', 'compensatory', 'unpaid'], required: true },
  annual_allocation: { type: Number, default: 0 },
  carry_forward: {
    allowed: { type: Boolean, default: false },
    max_days: { type: Number, default: 0 },
    expiry_months: { type: Number },
  },
  min_days: { type: Number, default: 0.5 },
  max_days: { type: Number },
  allow_half_day: { type: Boolean, default: true },
  requires_approval: { type: Boolean, default: true },
  is_paid: { type: Boolean, default: true },
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

leaveTypeSchema.index({ tenant_id: 1 });
leaveTypeSchema.index({ tenant_id: 1, is_active: 1 });
leaveTypeSchema.index({ code: 1, tenant_id: 1 });

export const LeaveType = mongoose.models.LeaveType || mongoose.model('LeaveType', leaveTypeSchema);
export default LeaveType;

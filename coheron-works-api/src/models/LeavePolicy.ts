import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const allocationSchema = new Schema({
  leave_type_id: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  annual_allocation: { type: Number, required: true },
  carry_forward_max: { type: Number, default: 0 },
}, { _id: false });

export interface ILeavePolicy extends Document {
  name: string;
  applicable_to: string;
  tenant_id: mongoose.Types.ObjectId;
}

const leavePolicySchema = new Schema({
  name: { type: String, required: true },
  applicable_to: { type: String },
  allocations: [allocationSchema],
  is_active: { type: Boolean, default: true },
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

leavePolicySchema.index({ tenant_id: 1 });
leavePolicySchema.index({ tenant_id: 1, is_active: 1 });

export const LeavePolicy = mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', leavePolicySchema);
export default LeavePolicy;

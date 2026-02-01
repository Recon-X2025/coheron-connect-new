import mongoose, { Schema, Document } from 'mongoose';

export interface ICompensationReview extends Document {
  tenant_id: mongoose.Types.ObjectId;
  plan_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  current_salary: number;
  proposed_salary: number;
  increase_pct: number;
  increase_type: 'merit' | 'promotion' | 'market_adjustment' | 'equity';
  justification: string;
  manager_id: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: mongoose.Types.ObjectId;
  effective_date: Date;
  created_at: Date;
  updated_at: Date;
}

const compensationReviewSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  plan_id: { type: Schema.Types.ObjectId, ref: 'CompensationPlan', required: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  current_salary: { type: Number, required: true },
  proposed_salary: { type: Number, required: true },
  increase_pct: { type: Number, default: 0 },
  increase_type: { type: String, enum: ['merit', 'promotion', 'market_adjustment', 'equity'], required: true },
  justification: { type: String, default: '' },
  manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  effective_date: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

compensationReviewSchema.index({ tenant_id: 1, plan_id: 1, employee_id: 1 });

export const CompensationReview = mongoose.model<ICompensationReview>('CompensationReview', compensationReviewSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IBenefitEnrollment extends Document {
  tenant_id: mongoose.Types.ObjectId;
  plan_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  coverage_option_name: string;
  dependents: Array<{
    name: string;
    relationship: string;
    date_of_birth: Date;
  }>;
  status: 'pending' | 'active' | 'cancelled' | 'terminated';
  effective_date: Date;
  termination_date?: Date;
  employee_contribution: number;
  employer_contribution: number;
  created_at: Date;
  updated_at: Date;
}

const benefitEnrollmentSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  plan_id: { type: Schema.Types.ObjectId, ref: 'BenefitPlan', required: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  coverage_option_name: { type: String, required: true },
  dependents: [{
    name: String,
    relationship: String,
    date_of_birth: Date,
  }],
  status: { type: String, enum: ['pending', 'active', 'cancelled', 'terminated'], default: 'pending' },
  effective_date: { type: Date, required: true },
  termination_date: Date,
  employee_contribution: { type: Number, default: 0 },
  employer_contribution: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

benefitEnrollmentSchema.index({ tenant_id: 1, plan_id: 1, employee_id: 1 });

export const BenefitEnrollment = mongoose.model<IBenefitEnrollment>('BenefitEnrollment', benefitEnrollmentSchema);

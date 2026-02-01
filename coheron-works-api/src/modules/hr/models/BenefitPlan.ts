import mongoose, { Schema, Document } from 'mongoose';

export interface IBenefitPlan extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  type: 'health' | 'dental' | 'vision' | 'life' | 'retirement' | 'wellness' | 'other';
  provider: string;
  description: string;
  coverage_options: Array<{
    name: string;
    employee_cost: number;
    employer_cost: number;
    coverage_details: string;
  }>;
  eligibility_rules: {
    min_tenure_days: number;
    employment_types: string[];
  };
  enrollment_start: Date;
  enrollment_end: Date;
  plan_year: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const benefitPlanSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['health', 'dental', 'vision', 'life', 'retirement', 'wellness', 'other'], required: true },
  provider: { type: String, default: '' },
  description: { type: String, default: '' },
  coverage_options: [{
    name: String,
    employee_cost: { type: Number, default: 0 },
    employer_cost: { type: Number, default: 0 },
    coverage_details: String,
  }],
  eligibility_rules: {
    min_tenure_days: { type: Number, default: 0 },
    employment_types: [String],
  },
  enrollment_start: Date,
  enrollment_end: Date,
  plan_year: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

benefitPlanSchema.index({ tenant_id: 1, plan_year: 1 });

export const BenefitPlan = mongoose.model<IBenefitPlan>('BenefitPlan', benefitPlanSchema);

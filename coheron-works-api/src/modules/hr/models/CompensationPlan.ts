import mongoose, { Schema, Document } from 'mongoose';

export interface ICompensationPlan extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  fiscal_year: number;
  total_budget: number;
  allocated_budget: number;
  status: 'draft' | 'active' | 'closed';
  guidelines: {
    min_increase_pct: number;
    max_increase_pct: number;
    merit_pool_pct: number;
    promotion_pool_pct: number;
  };
  pay_bands: Array<{
    grade: string;
    min_salary: number;
    mid_salary: number;
    max_salary: number;
    currency: string;
  }>;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const compensationPlanSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  fiscal_year: { type: Number, required: true },
  total_budget: { type: Number, default: 0 },
  allocated_budget: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
  guidelines: {
    min_increase_pct: { type: Number, default: 0 },
    max_increase_pct: { type: Number, default: 0 },
    merit_pool_pct: { type: Number, default: 0 },
    promotion_pool_pct: { type: Number, default: 0 },
  },
  pay_bands: [{
    grade: String,
    min_salary: Number,
    mid_salary: Number,
    max_salary: Number,
    currency: { type: String, default: 'USD' },
  }],
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

compensationPlanSchema.index({ tenant_id: 1, fiscal_year: 1 });

export const CompensationPlan = mongoose.model<ICompensationPlan>('CompensationPlan', compensationPlanSchema);

import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const payslipSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  name: { type: String },
  date_from: { type: Date, required: true },
  date_to: { type: Date, required: true },
  basic_wage: { type: Number, default: 0 },
  gross_wage: { type: Number, default: 0 },
  net_wage: { type: Number, default: 0 },
  state: { type: String, default: 'draft' },
  tax_deductions: {
    tds: { type: Number, default: 0 },
    professional_tax: { type: Number, default: 0 },
    regime: { type: String, enum: ['old', 'new'], default: 'new' },
  },
  deduction_breakdown: [{
    name: { type: String },
    amount: { type: Number },
    section: { type: String },
  }],
}, schemaOptions);

payslipSchema.index({ employee_id: 1 });
payslipSchema.index({ state: 1 });
payslipSchema.index({ date_from: -1 });
payslipSchema.index({ employee_id: 1, state: 1 });

const salaryStructureSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  component_type: { type: String },
  component_name: { type: String },
  amount: { type: Number, default: 0 },
  calculation_type: { type: String },
  percentage: { type: Number },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

salaryStructureSchema.index({ employee_id: 1 });
salaryStructureSchema.index({ is_active: 1 });

export const Payslip = mongoose.model('Payslip', payslipSchema);
export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);

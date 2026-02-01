import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IPayrollRun extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  month: string;
  status: string;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employer_contributions: number;
  payslip_ids: mongoose.Types.ObjectId[];
  computed_at: Date | null;
  approved_by: mongoose.Types.ObjectId | null;
  approved_at: Date | null;
  paid_at: Date | null;
}

const payrollRunSchema = new Schema<IPayrollRun>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  month: { type: String, required: true },
  status: { type: String, default: 'draft', enum: ['draft', 'processing', 'computed', 'approved', 'paid', 'cancelled'] },
  total_employees: { type: Number, default: 0 },
  total_gross: { type: Number, default: 0 },
  total_deductions: { type: Number, default: 0 },
  total_net: { type: Number, default: 0 },
  total_employer_contributions: { type: Number, default: 0 },
  payslip_ids: [{ type: Schema.Types.ObjectId, ref: 'Payslip' }],
  computed_at: { type: Date, default: null },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approved_at: { type: Date, default: null },
  paid_at: { type: Date, default: null },
}, defaultSchemaOptions);

payrollRunSchema.index({ tenant_id: 1, month: 1 }, { unique: true });
payrollRunSchema.index({ status: 1 });

const PayrollRunModel = mongoose.model<IPayrollRun>('PayrollRun', payrollRunSchema);
export { PayrollRunModel as PayrollRun };
export default PayrollRunModel;

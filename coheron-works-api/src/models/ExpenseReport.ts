import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IExpenseReport extends Document {
  tenant_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  report_number: string;
  title: string;
  description?: string;
  expense_ids: mongoose.Types.ObjectId[];
  total_amount: number;
  status: string;
  submitted_at?: Date;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  reimbursed_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const ExpenseReportSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  report_number: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  expense_ids: [{ type: Schema.Types.ObjectId, ref: 'Expense' }],
  total_amount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft','submitted','approved','partially_approved','rejected','reimbursed'],
    default: 'draft',
  },
  submitted_at: { type: Date },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  reimbursed_at: { type: Date },
  notes: { type: String },
}, schemaOptions);

ExpenseReportSchema.index({ tenant_id: 1, employee_id: 1 });
ExpenseReportSchema.index({ tenant_id: 1, status: 1 });

export const ExpenseReport = mongoose.model<IExpenseReport>('ExpenseReport', ExpenseReportSchema);
export default ExpenseReport;

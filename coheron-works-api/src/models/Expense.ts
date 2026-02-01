import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IExpense extends Document {
  tenant_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  expense_number: string;
  expense_date: Date;
  category: string;
  description: string;
  amount: number;
  currency: string;
  receipt_url?: string;
  receipt_file_name?: string;
  status: string;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  rejected_reason?: string;
  reimbursement_date?: Date;
  reimbursement_reference?: string;
  project_id?: mongoose.Types.ObjectId;
  department_id?: mongoose.Types.ObjectId;
  tax_amount: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const ExpenseSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  expense_number: { type: String, required: true },
  expense_date: { type: Date, required: true },
  category: {
    type: String,
    enum: ['travel','meals','accommodation','transport','office_supplies','software','training','other'],
    default: 'other',
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true, default: 0 },
  currency: { type: String, default: 'INR' },
  receipt_url: { type: String },
  receipt_file_name: { type: String },
  status: {
    type: String,
    enum: ['draft','submitted','approved','rejected','reimbursed'],
    default: 'draft',
  },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  rejected_reason: { type: String },
  reimbursement_date: { type: Date },
  reimbursement_reference: { type: String },
  project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
  department_id: { type: Schema.Types.ObjectId },
  tax_amount: { type: Number, default: 0 },
  notes: { type: String },
}, schemaOptions);

ExpenseSchema.index({ tenant_id: 1, employee_id: 1 });
ExpenseSchema.index({ tenant_id: 1, status: 1 });
ExpenseSchema.index({ tenant_id: 1, expense_date: 1 });

export const Expense = mongoose.model<IExpense>("Expense", ExpenseSchema);
export default Expense;

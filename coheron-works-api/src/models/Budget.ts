import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

const budgetLineSchema = new Schema({
  account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount', required: true },
  cost_center_id: { type: Schema.Types.ObjectId, default: null },
  period: { type: String, required: true },
  budgeted_amount: { type: Number, default: 0 },
});

export interface IBudget extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  fiscal_year_id: mongoose.Types.ObjectId;
  status: string;
  lines: any[];
}

const budgetSchema = new Schema<IBudget>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  fiscal_year_id: { type: Schema.Types.ObjectId, ref: 'FiscalYear', required: true },
  status: { type: String, default: 'draft', enum: ['draft', 'approved', 'closed'] },
  lines: [budgetLineSchema],
}, defaultSchemaOptions);

budgetSchema.index({ tenant_id: 1, fiscal_year_id: 1 });

const BudgetModel = mongoose.model<IBudget>('Budget', budgetSchema);
export { BudgetModel as Budget };
export default BudgetModel;

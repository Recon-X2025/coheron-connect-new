import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IConsolidationRun extends Document {
  tenant_id: mongoose.Types.ObjectId;
  group_id: mongoose.Types.ObjectId;
  period_start: Date;
  period_end: Date;
  status: string;
  eliminations: {
    type: string;
    description: string;
    debit_account: mongoose.Types.ObjectId;
    credit_account: mongoose.Types.ObjectId;
    amount: number;
  }[];
  consolidated_totals: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    total_revenue: number;
    total_expenses: number;
  };
  notes: string;
  created_by: mongoose.Types.ObjectId;
  completed_at: Date;
}

const eliminationSchema = new Schema({
  type: { type: String, enum: ['intercompany', 'unrealized_profit', 'minority_interest'], required: true },
  description: { type: String },
  debit_account: { type: Schema.Types.ObjectId, ref: 'AccountAccount' },
  credit_account: { type: Schema.Types.ObjectId, ref: 'AccountAccount' },
  amount: { type: Number, required: true },
}, { _id: false });

const consolidationRunSchema = new Schema<IConsolidationRun>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  group_id: { type: Schema.Types.ObjectId, ref: 'ConsolidationGroup', required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  status: { type: String, default: 'draft', enum: ['draft', 'in_progress', 'completed', 'failed'] },
  eliminations: [eliminationSchema],
  consolidated_totals: {
    total_assets: { type: Number, default: 0 },
    total_liabilities: { type: Number, default: 0 },
    total_equity: { type: Number, default: 0 },
    total_revenue: { type: Number, default: 0 },
    total_expenses: { type: Number, default: 0 },
  },
  notes: { type: String, default: '' },
  created_by: { type: Schema.Types.ObjectId },
  completed_at: { type: Date },
}, defaultSchemaOptions);

consolidationRunSchema.index({ tenant_id: 1, group_id: 1 });
consolidationRunSchema.index({ tenant_id: 1, status: 1 });

const ConsolidationRunModel = mongoose.model<IConsolidationRun>('ConsolidationRun', consolidationRunSchema);
export { ConsolidationRunModel as ConsolidationRun };
export default ConsolidationRunModel;

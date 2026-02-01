import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IRevenueContract extends Document {
  tenant_id: mongoose.Types.ObjectId;
  contract_number: string;
  customer_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  total_value: number;
  performance_obligations: {
    description: string;
    standalone_price: number;
    allocated_price: number;
    recognition_method: string;
    progress_measure: string;
    is_satisfied: boolean;
  }[];
  status: string;
  journal_entry_ids: mongoose.Types.ObjectId[];
}

const obligationSchema = new Schema({
  description: { type: String, required: true },
  standalone_price: { type: Number, required: true },
  allocated_price: { type: Number, required: true },
  recognition_method: { type: String, enum: ['point_in_time', 'over_time'], required: true },
  progress_measure: { type: String, enum: ['output', 'input', 'time'], default: 'time' },
  is_satisfied: { type: Boolean, default: false },
}, { _id: false });

const revenueContractSchema = new Schema<IRevenueContract>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  contract_number: { type: String, required: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  total_value: { type: Number, required: true },
  performance_obligations: [obligationSchema],
  status: { type: String, default: 'draft', enum: ['draft', 'active', 'completed', 'cancelled'] },
  journal_entry_ids: [{ type: Schema.Types.ObjectId }],
}, defaultSchemaOptions);

revenueContractSchema.index({ tenant_id: 1, contract_number: 1 }, { unique: true });
revenueContractSchema.index({ tenant_id: 1, status: 1 });

const RevenueContractModel = mongoose.model<IRevenueContract>('RevenueContract', revenueContractSchema);
export { RevenueContractModel as RevenueContract };
export default RevenueContractModel;

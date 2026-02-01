import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IRevenueSchedule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  contract_id: mongoose.Types.ObjectId;
  obligation_index: number;
  period: string;
  amount: number;
  recognized: boolean;
  status: string;
  recognition_date: Date;
  journal_entry_id: mongoose.Types.ObjectId;
}

const revenueScheduleSchema = new Schema<IRevenueSchedule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  contract_id: { type: Schema.Types.ObjectId, ref: 'RevenueContract', required: true },
  obligation_index: { type: Number, required: true },
  period: { type: String, required: true },
  amount: { type: Number, required: true },
  recognized: { type: Boolean, default: false },
  status: { type: String, default: 'pending', enum: ['pending', 'recognized', 'deferred'] },
  recognition_date: { type: Date },
  journal_entry_id: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

revenueScheduleSchema.index({ tenant_id: 1, contract_id: 1 });
revenueScheduleSchema.index({ tenant_id: 1, period: 1, status: 1 });

const RevenueScheduleModel = mongoose.model<IRevenueSchedule>('RevenueSchedule', revenueScheduleSchema);
export { RevenueScheduleModel as RevenueSchedule };
export default RevenueScheduleModel;

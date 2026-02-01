import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IDeferralSchedule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  type: string;
  source_document_type: string;
  source_document_id: mongoose.Types.ObjectId;
  description: string;
  total_amount: number;
  deferred_account_id: mongoose.Types.ObjectId;
  recognition_account_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  periods: {
    period: string;
    amount: number;
    status: string;
    recognition_date: Date;
    journal_entry_id: mongoose.Types.ObjectId;
  }[];
  method: string;
  status: string;
  created_by: mongoose.Types.ObjectId;
}

const deferralPeriodSchema = new Schema({
  period: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'recognized'] },
  recognition_date: { type: Date },
  journal_entry_id: { type: Schema.Types.ObjectId },
}, { _id: false });

const deferralScheduleSchema = new Schema<IDeferralSchedule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, required: true, enum: ['revenue', 'expense'] },
  source_document_type: { type: String, enum: ['invoice', 'bill', 'manual'], default: 'manual' },
  source_document_id: { type: Schema.Types.ObjectId },
  description: { type: String, required: true },
  total_amount: { type: Number, required: true },
  deferred_account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount' },
  recognition_account_id: { type: Schema.Types.ObjectId, ref: 'AccountAccount' },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  periods: [deferralPeriodSchema],
  method: { type: String, default: 'straight_line', enum: ['straight_line', 'custom'] },
  status: { type: String, default: 'active', enum: ['active', 'completed', 'cancelled'] },
  created_by: { type: Schema.Types.ObjectId },
}, defaultSchemaOptions);

deferralScheduleSchema.index({ tenant_id: 1, type: 1 });
deferralScheduleSchema.index({ tenant_id: 1, status: 1 });

const DeferralScheduleModel = mongoose.model<IDeferralSchedule>('DeferralSchedule', deferralScheduleSchema);
export { DeferralScheduleModel as DeferralSchedule };
export default DeferralScheduleModel;

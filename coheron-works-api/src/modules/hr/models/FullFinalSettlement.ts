import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlementComponent {
  component: string;
  type: 'earning' | 'deduction';
  amount: number;
  remarks?: string;
}

export interface IFullFinalSettlement extends Document {
  tenant_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  settlement_number: string;
  resignation_date: Date;
  last_working_date: Date;
  settlement_date?: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'processed' | 'paid' | 'cancelled';
  components: ISettlementComponent[];
  leave_encashment_days: number;
  leave_encashment_amount: number;
  notice_period_days: number;
  notice_period_recovery: number;
  gratuity_amount: number;
  gratuity_eligible: boolean;
  bonus_amount: number;
  total_earnings: number;
  total_deductions: number;
  net_settlement_amount: number;
  payment_mode?: 'bank_transfer' | 'cheque' | 'cash';
  payment_reference?: string;
  paid_at?: Date;
  approved_by?: mongoose.Types.ObjectId;
  remarks?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const settlementComponentSchema = new Schema({
  component: { type: String, required: true },
  type: { type: String, enum: ['earning', 'deduction'], required: true },
  amount: { type: Number, required: true },
  remarks: String,
}, { _id: false });

const fullFinalSettlementSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  settlement_number: { type: String, required: true },
  resignation_date: { type: Date, required: true },
  last_working_date: { type: Date, required: true },
  settlement_date: Date,
  status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'processed', 'paid', 'cancelled'], default: 'draft' },
  components: [settlementComponentSchema],
  leave_encashment_days: { type: Number, default: 0 },
  leave_encashment_amount: { type: Number, default: 0 },
  notice_period_days: { type: Number, default: 0 },
  notice_period_recovery: { type: Number, default: 0 },
  gratuity_amount: { type: Number, default: 0 },
  gratuity_eligible: { type: Boolean, default: false },
  bonus_amount: { type: Number, default: 0 },
  total_earnings: { type: Number, default: 0 },
  total_deductions: { type: Number, default: 0 },
  net_settlement_amount: { type: Number, default: 0 },
  payment_mode: { type: String, enum: ['bank_transfer', 'cheque', 'cash'] },
  payment_reference: String,
  paid_at: Date,
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  remarks: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

fullFinalSettlementSchema.index({ tenant_id: 1, settlement_number: 1 }, { unique: true });
fullFinalSettlementSchema.index({ tenant_id: 1, employee_id: 1 });

export const FullFinalSettlement = mongoose.model<IFullFinalSettlement>('FullFinalSettlement', fullFinalSettlementSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IPaymentTransaction extends Document {
  tenant_id: string;
  gateway_id: string;
  order_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  gateway_reference: string;
  gateway_response: any;
  card_last_four: string;
  card_brand: string;
  tip_amount: number;
  split_payments: { method: string; amount: number; gateway_id?: string; reference?: string }[];
  refund_amount: number;
  refund_reason: string;
  refund_reference: string;
  processed_at: Date;
  settled_at: Date;
  settlement_reference: string;
}

const PaymentTransactionSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  gateway_id: { type: Schema.Types.ObjectId, ref: 'PaymentGateway' },
  order_id: { type: String, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  method: { type: String, required: true, enum: ['card', 'upi', 'wallet', 'bank_transfer', 'cash', 'check', 'split'] },
  status: { type: String, required: true, default: 'pending', enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'voided'] },
  gateway_reference: { type: String },
  gateway_response: { type: Schema.Types.Mixed },
  card_last_four: { type: String },
  card_brand: { type: String },
  tip_amount: { type: Number, default: 0 },
  split_payments: [{
    method: String,
    amount: Number,
    gateway_id: { type: Schema.Types.ObjectId, ref: 'PaymentGateway' },
    reference: String,
  }],
  refund_amount: { type: Number, default: 0 },
  refund_reason: { type: String },
  refund_reference: { type: String },
  processed_at: { type: Date },
  settled_at: { type: Date },
  settlement_reference: { type: String },
}, defaultSchemaOptions);

PaymentTransactionSchema.index({ tenant_id: 1, status: 1 });
PaymentTransactionSchema.index({ tenant_id: 1, processed_at: -1 });
PaymentTransactionSchema.index({ tenant_id: 1, settled_at: -1 });

export const PaymentTransaction = mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);
export default PaymentTransaction;

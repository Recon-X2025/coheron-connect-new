import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IPosPayment extends Document {
  order_id: mongoose.Types.ObjectId;
  payment_method: string;
  amount: number;
  currency: string;
  gateway_transaction_id: string;
  gateway_response: any;
  payment_status: string;
}

const posPaymentSchema = new Schema<IPosPayment>({
  order_id: { type: Schema.Types.ObjectId, ref: 'PosOrder', required: true },
  payment_method: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  gateway_transaction_id: { type: String },
  gateway_response: { type: Schema.Types.Mixed },
  payment_status: { type: String, default: 'success' },
}, defaultSchemaOptions);

// Indexes
posPaymentSchema.index({ order_id: 1 });
posPaymentSchema.index({ payment_status: 1 });
posPaymentSchema.index({ payment_method: 1 });
posPaymentSchema.index({ created_at: -1 });

export default mongoose.model<IPosPayment>('PosPayment', posPaymentSchema);

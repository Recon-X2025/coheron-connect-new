import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IPaymentGateway extends Document {
  tenant_id: string;
  name: string;
  provider: string;
  config: {
    api_key?: string;
    api_secret?: string;
    merchant_id?: string;
    webhook_secret?: string;
    sandbox_mode?: boolean;
  };
  supported_methods: string[];
  supported_currencies: string[];
  is_active: boolean;
  is_default: boolean;
  processing_fee_pct: number;
  fixed_fee: number;
  settlement_days: number;
}

const PaymentGatewaySchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  provider: { type: String, required: true, enum: ['stripe', 'razorpay', 'square', 'paypal', 'adyen', 'worldpay', 'custom'] },
  config: {
    api_key: { type: String },
    api_secret: { type: String },
    merchant_id: { type: String },
    webhook_secret: { type: String },
    sandbox_mode: { type: Boolean, default: true },
  },
  supported_methods: [{ type: String, enum: ['card', 'upi', 'wallet', 'bank_transfer', 'cash', 'check'] }],
  supported_currencies: [{ type: String }],
  is_active: { type: Boolean, default: true },
  is_default: { type: Boolean, default: false },
  processing_fee_pct: { type: Number, default: 0 },
  fixed_fee: { type: Number, default: 0 },
  settlement_days: { type: Number, default: 2 },
}, defaultSchemaOptions);

PaymentGatewaySchema.index({ tenant_id: 1, provider: 1 });
PaymentGatewaySchema.index({ tenant_id: 1, is_default: 1 });

export const PaymentGateway = mongoose.model<IPaymentGateway>('PaymentGateway', PaymentGatewaySchema);
export default PaymentGateway;

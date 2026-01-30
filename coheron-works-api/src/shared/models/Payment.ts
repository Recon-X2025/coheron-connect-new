import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const paymentSchema = new Schema({
  order_id: { type: String }, // razorpay order id
  payment_id: { type: String }, // razorpay payment id
  signature: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'authorized', 'captured', 'refunded', 'failed'], default: 'created' },
  method: { type: String }, // card, upi, netbanking, wallet
  receipt: { type: String },
  notes: { type: Schema.Types.Mixed },
  refund_id: { type: String },
  refund_amount: { type: Number },
  refund_status: { type: String },
  error_code: { type: String },
  error_description: { type: String },
  // Link to internal records
  entity_type: { type: String }, // 'invoice', 'website_order', 'pos_order'
  entity_id: { type: Schema.Types.ObjectId },
  tenant_id: { type: Schema.Types.ObjectId },
  webhook_payload: { type: Schema.Types.Mixed },
}, schemaOptions);

paymentSchema.index({ order_id: 1 });
paymentSchema.index({ payment_id: 1 });
paymentSchema.index({ entity_type: 1, entity_id: 1 });
paymentSchema.index({ tenant_id: 1, status: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

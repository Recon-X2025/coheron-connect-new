import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ISubscriptionItem {
  product_id?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface ISubscription extends Document {
  tenant_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  plan_name: string;
  description?: string;
  items: ISubscriptionItem[];
  billing_cycle: string;
  billing_day: number;
  custom_interval_days?: number;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  start_date: Date;
  end_date?: Date;
  next_billing_date?: Date;
  last_billed_date?: Date;
  status: string;
  auto_renew: boolean;
  payment_method?: string;
  payment_terms?: string;
  invoices_generated: number;
  notes?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unit_price: { type: Number, required: true, default: 0 },
}, { _id: false });

const SubscriptionSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  plan_name: { type: String, required: true },
  description: { type: String },
  items: { type: [SubscriptionItemSchema], default: [] },
  billing_cycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi_annual', 'annual', 'custom'],
    default: 'monthly',
  },
  billing_day: { type: Number, min: 1, max: 28, default: 1 },
  custom_interval_days: { type: Number },
  currency: { type: String, default: 'INR' },
  subtotal: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  next_billing_date: { type: Date },
  last_billed_date: { type: Date },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'cancelled', 'expired'],
    default: 'draft',
  },
  auto_renew: { type: Boolean, default: true },
  payment_method: { type: String },
  payment_terms: { type: String },
  invoices_generated: { type: Number, default: 0 },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);
SubscriptionSchema.index({ tenant_id: 1, status: 1 });
SubscriptionSchema.index({ tenant_id: 1, customer_id: 1 });
SubscriptionSchema.index({ tenant_id: 1, next_billing_date: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;

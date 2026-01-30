import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const orderLineSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_uom_qty: { type: Number, default: 0 },
  price_unit: { type: Number, default: 0 },
  price_subtotal: { type: Number, default: 0 },
});

const saleOrderSchema = new Schema({
  name: { type: String, unique: true },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  date_order: { type: Date, default: Date.now },
  amount_total: { type: Number, default: 0 },
  state: { type: String, default: 'draft' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  opportunity_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  order_line: [orderLineSchema],
}, schemaOptions);

saleOrderSchema.index({ partner_id: 1 });
saleOrderSchema.index({ state: 1 });
saleOrderSchema.index({ user_id: 1 });
saleOrderSchema.index({ opportunity_id: 1 });
saleOrderSchema.index({ partner_id: 1, date_order: -1 });

export const SaleOrder = mongoose.model('SaleOrder', saleOrderSchema);

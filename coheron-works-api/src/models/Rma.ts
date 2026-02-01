import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const rmaLineSchema = new Schema({
  sale_order_line_id: { type: Schema.Types.ObjectId },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity_returned: { type: Number },
  condition: { type: String, default: 'used' },
  refund_amount: { type: Number, default: 0 },
  replacement_product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
});

const rmaSchema = new Schema({
  rma_number: { type: String, unique: true },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  delivery_order_id: { type: Schema.Types.ObjectId, ref: 'DeliveryOrder' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  reason: { type: String },
  requested_date: { type: Date },
  refund_amount: { type: Number, default: 0 },
  notes: { type: String },
  status: { type: String, default: 'requested' },
  approved_date: { type: Date },
  received_date: { type: Date },
  processed_date: { type: Date },
  refund_method: { type: String },
  replacement_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  rma_lines: [rmaLineSchema],
}, schemaOptions);

const warrantySchema = new Schema({
  warranty_number: { type: String, unique: true },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  sale_order_line_id: { type: Schema.Types.ObjectId },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  warranty_type: { type: String },
  warranty_period_months: { type: Number },
  start_date: { type: Date },
  end_date: { type: Date },
  terms_and_conditions: { type: String },
  status: { type: String, default: 'active' },
}, schemaOptions);

const repairRequestSchema = new Schema({
  repair_number: { type: String, unique: true },
  warranty_id: { type: Schema.Types.ObjectId, ref: 'Warranty' },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  partner_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  issue_description: { type: String },
  requested_date: { type: Date },
  estimated_cost: { type: Number, default: 0 },
  actual_cost: { type: Number },
  status: { type: String, default: 'requested' },
  completed_date: { type: Date },
  repair_center: { type: String },
  notes: { type: String },
}, schemaOptions);

// Rma indexes
rmaSchema.index({ sale_order_id: 1 });
rmaSchema.index({ delivery_order_id: 1 });
rmaSchema.index({ partner_id: 1 });
rmaSchema.index({ status: 1 });
rmaSchema.index({ replacement_order_id: 1 });
rmaSchema.index({ partner_id: 1, status: 1 });

// Warranty indexes
warrantySchema.index({ sale_order_id: 1 });
warrantySchema.index({ product_id: 1 });
warrantySchema.index({ partner_id: 1 });
warrantySchema.index({ status: 1 });
warrantySchema.index({ end_date: 1 });

// RepairRequest indexes
repairRequestSchema.index({ warranty_id: 1 });
repairRequestSchema.index({ sale_order_id: 1 });
repairRequestSchema.index({ partner_id: 1 });
repairRequestSchema.index({ product_id: 1 });
repairRequestSchema.index({ status: 1 });

export const Rma = mongoose.models.Rma || mongoose.model('Rma', rmaSchema);
export const Warranty = mongoose.models.Warranty || mongoose.model('Warranty', warrantySchema);
export const RepairRequest = mongoose.models.RepairRequest || mongoose.model('RepairRequest', repairRequestSchema);

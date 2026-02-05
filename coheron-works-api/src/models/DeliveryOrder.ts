import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const deliveryOrderLineSchema = new Schema({
  sale_order_line_id: { type: Schema.Types.ObjectId },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity_ordered: { type: Number, default: 0 },
  quantity_delivered: { type: Number, default: 0 },
  quantity_pending: { type: Number, default: 0 },
});

const deliveryOrderSchema = new Schema({
  delivery_number: { type: String, unique: true },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  warehouse_id: { type: Schema.Types.ObjectId },
  delivery_date: { type: Date },
  delivery_address: { type: String },
  delivery_method: { type: String },
  status: { type: String, default: 'pending' },
  delivered_at: { type: Date },
  tracking_number: { type: String },
  carrier_name: { type: String },
  delivery_lines: [deliveryOrderLineSchema],
}, schemaOptions);

const shipmentTrackingSchema = new Schema({
  delivery_order_id: { type: Schema.Types.ObjectId, ref: 'DeliveryOrder' },
  tracking_event: { type: String },
  location: { type: String },
  notes: { type: String },
  event_date: { type: Date, default: Date.now },
}, schemaOptions);

const freightChargeSchema = new Schema({
  delivery_order_id: { type: Schema.Types.ObjectId, ref: 'DeliveryOrder' },
  charge_type: { type: String },
  amount: { type: Number },
  currency: { type: String, default: 'INR' },
  description: { type: String },
}, schemaOptions);

// DeliveryOrder indexes
deliveryOrderSchema.index({ sale_order_id: 1 });
deliveryOrderSchema.index({ warehouse_id: 1 });
deliveryOrderSchema.index({ status: 1 });
deliveryOrderSchema.index({ delivery_date: -1 });
deliveryOrderSchema.index({ sale_order_id: 1, status: 1 });

// ShipmentTracking indexes
shipmentTrackingSchema.index({ delivery_order_id: 1 });
shipmentTrackingSchema.index({ event_date: -1 });

// FreightCharge indexes
freightChargeSchema.index({ delivery_order_id: 1 });

export const DeliveryOrder = mongoose.models.DeliveryOrder || mongoose.model('DeliveryOrder', deliveryOrderSchema);
export const ShipmentTracking = mongoose.models.ShipmentTracking || mongoose.model('ShipmentTracking', shipmentTrackingSchema);
export const FreightCharge = mongoose.models.FreightCharge || mongoose.model('FreightCharge', freightChargeSchema);

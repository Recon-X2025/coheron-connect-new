import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const addressSchema = new Schema({
  name: { type: String },
  company: { type: String },
  street1: { type: String },
  street2: { type: String },
  city: { type: String },
  state: { type: String },
  postal_code: { type: String },
  country: { type: String },
  phone: { type: String },
  email: { type: String },
}, { _id: false });

const packageItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number },
  serial_numbers: [{ type: String }],
}, { _id: false });

const packageSchema = new Schema({
  weight: { type: Number },
  length: { type: Number },
  width: { type: Number },
  height: { type: Number },
  items: [packageItemSchema],
}, { _id: false });

const shipmentSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  shipment_number: { type: String, required: true },
  carrier_id: { type: Schema.Types.ObjectId, ref: 'ShippingCarrier', required: true },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  delivery_order_id: { type: Schema.Types.ObjectId },
  tracking_number: { type: String },
  tracking_url: { type: String },
  service_code: { type: String },
  status: {
    type: String,
    enum: ['draft', 'label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'exception'],
    default: 'draft',
  },
  estimated_delivery: { type: Date },
  actual_delivery: { type: Date },
  shipper_address: addressSchema,
  recipient_address: addressSchema,
  packages: [packageSchema],
  shipping_cost: { type: Number, default: 0 },
  insurance_amount: { type: Number, default: 0 },
  label_url: { type: String },
  notes: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

shipmentSchema.index({ tenant_id: 1, shipment_number: 1 }, { unique: true });
shipmentSchema.index({ tenant_id: 1, tracking_number: 1 });
shipmentSchema.index({ tenant_id: 1, sale_order_id: 1 });
shipmentSchema.index({ status: 1 });

export const Shipment = mongoose.model('Shipment', shipmentSchema);

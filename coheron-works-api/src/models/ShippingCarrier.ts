import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const supportedServiceSchema = new Schema({
  service_code: { type: String, required: true },
  service_name: { type: String, required: true },
  estimated_days: { type: Number },
}, { _id: false });

const shippingCarrierSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  code: { type: String, enum: ['fedex', 'dhl', 'ups', 'usps', 'bluedart', 'delhivery', 'custom'], required: true },
  api_key: { type: String },
  api_secret: { type: String },
  account_number: { type: String },
  test_mode: { type: Boolean, default: true },
  is_active: { type: Boolean, default: true },
  base_url: { type: String },
  tracking_url_template: { type: String },
  supported_services: [supportedServiceSchema],
  weight_unit: { type: String, default: 'kg' },
  dimension_unit: { type: String, default: 'cm' },
}, schemaOptions);

shippingCarrierSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

export const ShippingCarrier = mongoose.models.ShippingCarrier || mongoose.model('ShippingCarrier', shippingCarrierSchema);

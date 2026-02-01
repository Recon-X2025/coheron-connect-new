import mongoose, { Schema, Document } from 'mongoose';
const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IFieldServiceOrder extends Document {
  tenant_id: string;
  order_number: string;
  ticket_id?: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  product_id?: mongoose.Types.ObjectId;
  serial_number_id?: mongoose.Types.ObjectId;
  warranty_id?: mongoose.Types.ObjectId;
  service_type: string;
  priority: string;
  description: string;
  technician_id: mongoose.Types.ObjectId;
  scheduled_date: Date;
  scheduled_time_slot?: string;
  actual_start?: Date;
  actual_end?: Date;
  travel_time_minutes?: number;
  service_time_minutes?: number;
  status: string;
  location_address?: {
    street?: string; city?: string;
    state?: string; postal_code?: string; country?: string;
  };
  location_lat?: number;
  location_lng?: number;
  parts_used: Array<{
    product_id: mongoose.Types.ObjectId;
    quantity: number; serial_number?: string; cost: number;
  }>;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  is_warranty_claim: boolean;
  customer_signature_url?: string;
  notes?: string;
  photos: string[];
  checklist: Array<{ item: string; completed: boolean; notes?: string; }>;
  rating?: number;
  feedback?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const PartsUsedSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, required: true },
  serial_number: { type: String },
  cost: { type: Number, required: true },
}, { _id: false });

const ChecklistSchema = new Schema({
  item: { type: String, required: true },
  completed: { type: Boolean, default: false },
  notes: { type: String },
}, { _id: false });

const LocationAddressSchema = new Schema({
  street: { type: String },
  city: { type: String },
  state: { type: String },
  postal_code: { type: String },
  country: { type: String },
}, { _id: false });

const FieldServiceOrderSchema = new Schema<IFieldServiceOrder>({
  tenant_id: { type: String, required: true },
  order_number: { type: String, required: true },
  ticket_id: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  serial_number_id: { type: Schema.Types.ObjectId },
  warranty_id: { type: Schema.Types.ObjectId, ref: 'Warranty' },
  service_type: { type: String, enum: ['installation','repair','maintenance','inspection','replacement'], required: true },
  priority: { type: String, enum: ['low','medium','high','urgent'], default: "medium" },
  description: { type: String, required: true },
  technician_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  scheduled_date: { type: Date, required: true },
  scheduled_time_slot: { type: String },
  actual_start: { type: Date },
  actual_end: { type: Date },
  travel_time_minutes: { type: Number },
  service_time_minutes: { type: Number },
  status: { type: String, enum: ['draft','scheduled','dispatched','in_progress','completed','cancelled'], default: "draft" },
  location_address: LocationAddressSchema,
  location_lat: { type: Number },
  location_lng: { type: Number },
  parts_used: [PartsUsedSchema],
  labor_cost: { type: Number, default: 0 },
  parts_cost: { type: Number, default: 0 },
  total_cost: { type: Number, default: 0 },
  is_warranty_claim: { type: Boolean, default: false },
  customer_signature_url: { type: String },
  notes: { type: String },
  photos: [{ type: String }],
  checklist: [ChecklistSchema],
  rating: { type: Number },
  feedback: { type: String },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

FieldServiceOrderSchema.index({ tenant_id: 1, order_number: 1 }, { unique: true });
FieldServiceOrderSchema.index({ tenant_id: 1, technician_id: 1, scheduled_date: 1 });
FieldServiceOrderSchema.index({ tenant_id: 1, status: 1 });
FieldServiceOrderSchema.index({ tenant_id: 1, customer_id: 1 });

export const FieldServiceOrder = mongoose.model<IFieldServiceOrder>('FieldServiceOrder', FieldServiceOrderSchema);

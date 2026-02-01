import mongoose, { Schema, Document } from 'mongoose';
const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IWarranty extends Document {
  tenant_id: string;
  warranty_number: string;
  product_id: mongoose.Types.ObjectId;
  serial_number_id?: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  sale_order_id?: mongoose.Types.ObjectId;
  warranty_type: string;
  start_date: Date;
  end_date: Date;
  coverage_details: {
    parts: boolean; labor: boolean; onsite: boolean;
    max_claims?: number; max_amount?: number;
  };
  claims_made: number;
  amount_claimed: number;
  status: string;
  terms?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const CoverageDetailsSchema = new Schema({
  parts: { type: Boolean, default: true },
  labor: { type: Boolean, default: true },
  onsite: { type: Boolean, default: false },
  max_claims: { type: Number },
  max_amount: { type: Number },
}, { _id: false });

const WarrantySchema = new Schema<IWarranty>({
  tenant_id: { type: String, required: true },
  warranty_number: { type: String, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  serial_number_id: { type: Schema.Types.ObjectId },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
  sale_order_id: { type: Schema.Types.ObjectId, ref: 'SaleOrder' },
  warranty_type: { type: String, enum: ['standard','extended','limited'], default: "standard" },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  coverage_details: CoverageDetailsSchema,
  claims_made: { type: Number, default: 0 },
  amount_claimed: { type: Number, default: 0 },
  status: { type: String, enum: ['active','expired','voided'], default: "active" },
  terms: { type: String },
  notes: { type: String },
}, schemaOptions);

WarrantySchema.index({ tenant_id: 1, warranty_number: 1 }, { unique: true });
WarrantySchema.index({ tenant_id: 1, customer_id: 1 });
WarrantySchema.index({ tenant_id: 1, serial_number_id: 1 });
WarrantySchema.index({ tenant_id: 1, end_date: 1 });

export const Warranty = mongoose.model<IWarranty>('Warranty', WarrantySchema);

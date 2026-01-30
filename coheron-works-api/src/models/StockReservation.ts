import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const stockReservationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true },
  source_type: { type: String, enum: ['sale_order', 'manufacturing_order', 'transfer', 'manual'], required: true },
  source_id: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['active', 'fulfilled', 'cancelled', 'expired'], default: 'active' },
  reserved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  expires_at: { type: Date },
  fulfilled_at: { type: Date },
  cancelled_at: { type: Date },
  cancel_reason: { type: String },
  lot_number: { type: String },
  serial_number: { type: String },
}, schemaOptions);

stockReservationSchema.index({ tenant_id: 1, product_id: 1, status: 1 });
stockReservationSchema.index({ source_type: 1, source_id: 1 });
stockReservationSchema.index({ tenant_id: 1, warehouse_id: 1, status: 1 });
stockReservationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'active' } });

export const StockReservation = mongoose.model('StockReservation', stockReservationSchema);

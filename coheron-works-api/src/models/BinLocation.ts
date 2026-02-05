import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const binLocationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  zone_id: { type: Schema.Types.ObjectId, ref: 'WarehouseZone', required: true },
  bin_code: { type: String, required: true },
  aisle: { type: String, required: true },
  rack: { type: String, required: true },
  shelf: { type: String, required: true },
  bin: { type: String, required: true },
  barcode: { type: String, required: true },
  max_weight: { type: Number, default: 0 },
  max_volume: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  product_restrictions: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  current_product_id: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  current_quantity: { type: Number, default: 0 },
}, schemaOptions);

binLocationSchema.index({ tenant_id: 1, warehouse_id: 1, bin_code: 1 }, { unique: true });
binLocationSchema.index({ tenant_id: 1, barcode: 1 }, { unique: true });
binLocationSchema.index({ zone_id: 1 });

export const BinLocation = mongoose.models.BinLocation || mongoose.model('BinLocation', binLocationSchema);

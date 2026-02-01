import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const warehouseZoneSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  zone_type: { type: String, enum: ['receiving', 'storage', 'picking', 'shipping', 'quarantine'], required: true },
  temperature_controlled: { type: Boolean, default: false },
  max_capacity: { type: Number, default: 0 },
  current_utilization: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

warehouseZoneSchema.index({ tenant_id: 1, warehouse_id: 1, code: 1 }, { unique: true });

export const WarehouseZone = mongoose.model('WarehouseZone', warehouseZoneSchema);

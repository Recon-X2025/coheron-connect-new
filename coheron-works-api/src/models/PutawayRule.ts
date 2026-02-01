import mongoose, { Schema, Document } from 'mongoose';

export interface IPutawayRule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  priority: number;
  conditions: {
    product_id: mongoose.Types.ObjectId;
    product_category: string;
    abc_class: string;
    weight_range: { min: number; max: number };
    temperature_controlled: boolean;
    hazardous: boolean;
  };
  destination: {
    warehouse_id: mongoose.Types.ObjectId;
    zone_id: mongoose.Types.ObjectId;
    zone_type: string;
    bin_pattern: string;
  };
  strategy: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};


const putawayRuleSchema = new Schema<IPutawayRule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, ref: 'Tenant' },
  name: { type: String, required: true },
  priority: { type: Number, required: true, default: 10 },
  conditions: {
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    product_category: { type: String },
    abc_class: { type: String },
    weight_range: {
      min: { type: Number },
      max: { type: Number },
    },
    temperature_controlled: { type: Boolean },
    hazardous: { type: Boolean },
  },
  destination: {
    warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    zone_id: { type: Schema.Types.ObjectId, ref: 'WarehouseZone' },
    zone_type: { type: String },
    bin_pattern: { type: String },
  },
  strategy: { type: String, required: true, enum: ['fixed_location', 'nearest_empty', 'same_product', 'maximize_space', 'fifo_position'] },
  is_active: { type: Boolean, default: true },
}, schemaOptions);

putawayRuleSchema.index({ tenant_id: 1, is_active: 1, priority: 1 });

export const PutawayRule = mongoose.model<IPutawayRule>('PutawayRule', putawayRuleSchema);

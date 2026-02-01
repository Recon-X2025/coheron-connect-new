import mongoose, { Schema, Document } from 'mongoose';

export interface IHazmatClassification extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  packing_group: 'I' | 'II' | 'III';
  label_codes: string[];
  special_provisions: string;
  erg_number: string;
  requires_placard: boolean;
  storage_requirements: {
    temperature_min: number;
    temperature_max: number;
    segregation_group: string;
    ventilation_required: boolean;
  };
  transport_restrictions: {
    air_allowed: boolean;
    sea_allowed: boolean;
    road_allowed: boolean;
    rail_allowed: boolean;
  };
  emergency_contact: string;
  sds_url: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const hazmatClassificationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  un_number: { type: String, required: true },
  proper_shipping_name: { type: String, required: true },
  hazard_class: { type: String, required: true },
  packing_group: { type: String, enum: ['I', 'II', 'III'] },
  label_codes: [{ type: String }],
  special_provisions: String,
  erg_number: String,
  requires_placard: { type: Boolean, default: false },
  storage_requirements: {
    temperature_min: Number,
    temperature_max: Number,
    segregation_group: String,
    ventilation_required: { type: Boolean, default: false },
  },
  transport_restrictions: {
    air_allowed: { type: Boolean, default: true },
    sea_allowed: { type: Boolean, default: true },
    road_allowed: { type: Boolean, default: true },
    rail_allowed: { type: Boolean, default: true },
  },
  emergency_contact: String,
  sds_url: String,
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

hazmatClassificationSchema.index({ tenant_id: 1, product_id: 1 }, { unique: true });
hazmatClassificationSchema.index({ tenant_id: 1, hazard_class: 1 });

export const HazmatClassification = mongoose.model<IHazmatClassification>('HazmatClassification', hazmatClassificationSchema);

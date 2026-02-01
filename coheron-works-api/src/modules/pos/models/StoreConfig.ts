import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface IStoreConfig extends Document {
  tenant_id: mongoose.Types.ObjectId;
  store_id: mongoose.Types.ObjectId;
  receipt_header: string;
  receipt_footer: string;
  tax_config: {
    tax_inclusive: boolean;
    default_tax_rate: number;
  };
  payment_methods: {
    type: string;
    enabled: boolean;
    config: Record<string, any>;
  }[];
  pos_settings: {
    allow_discount: boolean;
    max_discount_pct: number;
    require_customer: boolean;
  };
}

const storeConfigSchema = new Schema<IStoreConfig>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  store_id: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  receipt_header: { type: String },
  receipt_footer: { type: String },
  tax_config: {
    tax_inclusive: { type: Boolean, default: false },
    default_tax_rate: { type: Number, default: 0 },
  },
  payment_methods: [{
    type: { type: String },
    enabled: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} },
  }],
  pos_settings: {
    allow_discount: { type: Boolean, default: true },
    max_discount_pct: { type: Number, default: 100 },
    require_customer: { type: Boolean, default: false },
  },
}, defaultSchemaOptions);

storeConfigSchema.index({ tenant_id: 1, store_id: 1 }, { unique: true });

export const StoreConfig = mongoose.model<IStoreConfig>('StoreConfig', storeConfigSchema);

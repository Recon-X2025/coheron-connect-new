import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ITaxRule extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  tax_type: string;
  country_code: string;
  state_code: string;
  hsn_code_pattern: string;
  product_category_id: mongoose.Types.ObjectId | null;
  rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cess_rate: number;
  vat_rate: number;
  reverse_charge: boolean;
  valid_from: Date | null;
  valid_until: Date | null;
  is_active: boolean;
}

const taxRuleSchema = new Schema<ITaxRule>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  tax_type: { type: String, required: true, enum: ['gst', 'vat', 'sales_tax', 'exempt'] },
  country_code: { type: String, required: true },
  state_code: { type: String, default: '' },
  hsn_code_pattern: { type: String, default: '' },
  product_category_id: { type: Schema.Types.ObjectId, ref: 'ProductCategory', default: null },
  rate: { type: Number, default: 0 },
  cgst_rate: { type: Number, default: 0 },
  sgst_rate: { type: Number, default: 0 },
  igst_rate: { type: Number, default: 0 },
  cess_rate: { type: Number, default: 0 },
  vat_rate: { type: Number, default: 0 },
  reverse_charge: { type: Boolean, default: false },
  valid_from: { type: Date, default: null },
  valid_until: { type: Date, default: null },
  is_active: { type: Boolean, default: true },
}, defaultSchemaOptions);

taxRuleSchema.index({ tenant_id: 1, tax_type: 1, country_code: 1 });
taxRuleSchema.index({ tenant_id: 1, hsn_code_pattern: 1 });
taxRuleSchema.index({ is_active: 1 });

const TaxRuleModel = mongoose.model<ITaxRule>('TaxRule', taxRuleSchema);
export { TaxRuleModel as TaxRule };
export default TaxRuleModel;

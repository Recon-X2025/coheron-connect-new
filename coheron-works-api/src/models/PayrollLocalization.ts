import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const taxBracketSchema = new Schema({
  from: { type: Number, required: true },
  to: { type: Number, required: true },
  rate: { type: Number, required: true },
  cess_rate: { type: Number, default: 0 },
}, { _id: false });

const exemptionSchema = new Schema({
  name: { type: String, required: true },
  max_amount: { type: Number, required: true },
  section: { type: String },
}, { _id: false });

const socialSecurityComponentSchema = new Schema({
  name: { type: String, required: true },
  employee_rate: { type: Number, required: true },
  employer_rate: { type: Number, required: true },
  max_basis: { type: Number },
  is_mandatory: { type: Boolean, default: true },
}, { _id: false });

const statutoryComponentSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["deduction", "contribution", "tax"], required: true },
  calculation: { type: String, enum: ["percentage", "fixed", "slab"], required: true },
  rate: { type: Number },
  max_amount: { type: Number },
  employer_share: { type: Number },
  employee_share: { type: Number },
  is_mandatory: { type: Boolean, default: true },
  applicable_to: { type: String, enum: ["all", "above_threshold"], default: "all" },
  threshold: { type: Number },
}, { _id: false });

const complianceReportSchema = new Schema({
  name: { type: String, required: true },
  frequency: { type: String, enum: ["monthly", "quarterly", "annual"], required: true },
  template: { type: String },
}, { _id: false });

const payrollLocalizationSchema = new Schema({
  tenant_id: { type: String, required: true },
  country_code: { type: String, required: true, maxlength: 3 },
  country_name: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  tax_config: {
    tax_brackets: [taxBracketSchema],
    standard_deduction: { type: Number, default: 0 },
    exemptions: [exemptionSchema],
  },
  social_security: {
    components: [socialSecurityComponentSchema],
  },
  statutory_components: [statutoryComponentSchema],
  payment_config: {
    currency: { type: String, required: true },
    payment_methods: [{ type: String, enum: ["bank_transfer", "check", "cash"] }],
    tax_year_start_month: { type: Number, default: 1 },
    pay_frequency_options: [{ type: String, enum: ["monthly", "biweekly", "weekly"] }],
  },
  compliance_reports: [complianceReportSchema],
  created_by: { type: Schema.Types.ObjectId, ref: "User" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, schemaOptions);

payrollLocalizationSchema.index({ tenant_id: 1, country_code: 1 }, { unique: true });

export interface IPayrollLocalization extends Document {
  tenant_id: string;
  country_code: string;
  country_name: string;
  is_active: boolean;
  tax_config: any;
  social_security: any;
  statutory_components: any[];
  payment_config: any;
  compliance_reports: any[];
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export const PayrollLocalization = mongoose.model<IPayrollLocalization>("PayrollLocalization", payrollLocalizationSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface ICountryLocalization extends Document {
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  date_format: string;
  number_format: { decimal_separator: string; thousands_separator: string; decimal_places: number };
  tax_system: string;
  tax_rates: { name: string; rate: number; type: string; is_default: boolean }[];
  fiscal_year_start: { month: number; day: number };
  chart_of_accounts_template?: string;
  payroll_components: { name: string; type: string; statutory: boolean; rate?: number }[];
  compliance_reports: { name: string; frequency: string; description: string }[];
  bank_formats: { name: string; format: string }[];
  address_format: string[];
  phone_code: string;
  languages: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const countryLocalizationSchema = new Schema({
  country_code: { type: String, required: true, unique: true },
  country_name: { type: String, required: true },
  currency_code: { type: String, required: true },
  currency_symbol: { type: String, required: true },
  date_format: { type: String, default: 'DD/MM/YYYY' },
  number_format: {
    decimal_separator: { type: String, default: '.' },
    thousands_separator: { type: String, default: ',' },
    decimal_places: { type: Number, default: 2 },
  },
  tax_system: { type: String, default: '' },
  tax_rates: [{ name: String, rate: Number, type: String, is_default: { type: Boolean, default: false } }],
  fiscal_year_start: { month: { type: Number, default: 1 }, day: { type: Number, default: 1 } },
  chart_of_accounts_template: String,
  payroll_components: [{ name: String, type: String, statutory: Boolean, rate: Number }],
  compliance_reports: [{ name: String, frequency: String, description: String }],
  bank_formats: [{ name: String, format: String }],
  address_format: [String],
  phone_code: { type: String, default: '' },
  languages: [String],
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const CountryLocalization = mongoose.model<ICountryLocalization>('CountryLocalization', countryLocalizationSchema);

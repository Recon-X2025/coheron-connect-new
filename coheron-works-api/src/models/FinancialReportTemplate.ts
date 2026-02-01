import mongoose, { Schema, Document } from 'mongoose';

export interface IReportRow {
  label: string;
  account_codes: string[];
  formula: string;
  row_type: 'account' | 'subtotal' | 'total' | 'header' | 'separator';
  indent_level: number;
  is_bold: boolean;
}

export interface IReportSection {
  name: string;
  display_order: number;
  rows: IReportRow[];
}

export interface IReportFilter {
  field: string;
  label: string;
  type: 'date' | 'select' | 'text';
}

export interface IFinancialReportTemplate extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  report_type: 'balance_sheet' | 'profit_and_loss' | 'cash_flow' | 'custom';
  description: string;
  sections: IReportSection[];
  filters: IReportFilter[];
  default_date_range: string;
  is_system: boolean;
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ReportRowSchema = new Schema({
  label: { type: String, required: true },
  account_codes: { type: [String], default: [] },
  formula: { type: String, default: '' },
  row_type: { type: String, enum: ['account', 'subtotal', 'total', 'header', 'separator'], default: 'account' },
  indent_level: { type: Number, default: 0 },
  is_bold: { type: Boolean, default: false },
}, { _id: false });

const ReportSectionSchema = new Schema({
  name: { type: String, required: true },
  display_order: { type: Number, default: 0 },
  rows: { type: [ReportRowSchema], default: [] },
}, { _id: false });

const ReportFilterSchema = new Schema({
  field: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['date', 'select', 'text'], default: 'text' },
}, { _id: false });

const FinancialReportTemplateSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  report_type: { type: String, enum: ['balance_sheet', 'profit_and_loss', 'cash_flow', 'custom'], required: true },
  description: { type: String, default: '' },
  sections: { type: [ReportSectionSchema], default: [] },
  filters: { type: [ReportFilterSchema], default: [] },
  default_date_range: { type: String, default: 'this_fiscal_year' },
  is_system: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
});

FinancialReportTemplateSchema.index({ tenant_id: 1, report_type: 1 });
FinancialReportTemplateSchema.index({ tenant_id: 1, is_active: 1 });

export default mongoose.model('FinancialReportTemplate', FinancialReportTemplateSchema);

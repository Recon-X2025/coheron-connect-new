import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduledReport extends Document {
  tenant_id: mongoose.Types.ObjectId;
  report_id: string;
  name: string;
  module: string;
  report_collection: string;
  columns: Array<{ field: string; label: string; type?: 'string' | 'number' | 'date' | 'currency' }>;
  filters: Record<string, any>;
  cron_expression: string;
  recipients: string[];
  format: 'csv' | 'pdf' | 'xlsx';
  is_active: boolean;
  next_run: Date;
  last_run: Date | null;
  last_status: 'success' | 'failed' | null;
  created_by: mongoose.Types.ObjectId;
}

const schema = new Schema<IScheduledReport>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  report_id: { type: String, required: true },
  name: { type: String, required: true },
  module: { type: String, required: true },
  report_collection: { type: String, required: true },
  columns: [{ field: String, label: String, type: String }],
  filters: { type: Schema.Types.Mixed, default: {} },
  cron_expression: { type: String, required: true },
  recipients: [{ type: String }],
  format: { type: String, enum: ['csv', 'pdf', 'xlsx'], default: 'xlsx' },
  is_active: { type: Boolean, default: true },
  next_run: { type: Date, required: true },
  last_run: { type: Date, default: null },
  last_status: { type: String, enum: ['success', 'failed', null], default: null },
  created_by: { type: Schema.Types.ObjectId },
}, { timestamps: true });

schema.index({ tenant_id: 1, is_active: 1, next_run: 1 });

export default mongoose.model<IScheduledReport>('ScheduledReport', schema);

import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ITaxReturn extends Document {
  name: string;
  tax_type: string;
  period_start: Date;
  period_end: Date;
  filing_date: Date | null;
  due_date: Date | null;
  state: string;
  export_file_path: string | null;
  filed_at: Date | null;
  filed_by: mongoose.Types.ObjectId | null;
}

const TaxReturnSchema = new Schema<ITaxReturn>({
  name: { type: String, required: true },
  tax_type: { type: String, required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  filing_date: { type: Date, default: null },
  due_date: { type: Date, default: null },
  state: { type: String, default: 'draft' },
  export_file_path: { type: String, default: null },
  filed_at: { type: Date, default: null },
  filed_by: { type: Schema.Types.ObjectId, default: null },
}, schemaOptions);

// Indexes
TaxReturnSchema.index({ state: 1 });
TaxReturnSchema.index({ tax_type: 1 });
TaxReturnSchema.index({ filed_by: 1 });
TaxReturnSchema.index({ due_date: 1 });
TaxReturnSchema.index({ period_start: 1, period_end: 1 });
TaxReturnSchema.index({ tax_type: 1, state: 1 });

export default mongoose.model<ITaxReturn>('TaxReturn', TaxReturnSchema);

import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const periodSchema = new Schema({
  name: { type: String },
  start_date: { type: Date },
  end_date: { type: Date },
  is_closed: { type: Boolean, default: false },
}, { _id: true });

export interface IFiscalYear extends Document {
  name: string;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  is_closed: boolean;
  tenant_id: mongoose.Types.ObjectId;
}

const fiscalYearSchema = new Schema({
  name: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  is_active: { type: Boolean, default: true },
  is_closed: { type: Boolean, default: false },
  periods: [periodSchema],
  tenant_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

fiscalYearSchema.index({ tenant_id: 1 });
fiscalYearSchema.index({ tenant_id: 1, is_active: 1 });

export const FiscalYear = mongoose.models.FiscalYear || mongoose.model('FiscalYear', fiscalYearSchema);
export default FiscalYear;

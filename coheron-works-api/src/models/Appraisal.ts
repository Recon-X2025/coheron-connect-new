import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const appraisalSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  manager_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  appraisal_period: { type: String },
  date_close: { type: Date },
  final_assessment: { type: String },
  state: { type: String, default: 'draft' },
}, schemaOptions);

appraisalSchema.index({ employee_id: 1 });
appraisalSchema.index({ manager_id: 1 });
appraisalSchema.index({ state: 1 });
appraisalSchema.index({ employee_id: 1, state: 1 });

export const Appraisal = mongoose.models.Appraisal || mongoose.model('Appraisal', appraisalSchema);

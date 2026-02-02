import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IReportOutput extends Document {
  report_id: string;
  name: string;
  format: string;
  buffer: string;
  org_id: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  metadata: any;
}

const reportOutputSchema = new Schema({
  report_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  format: { type: String, required: true },
  buffer: { type: String, required: true },
  org_id: { type: Schema.Types.ObjectId, ref: 'Organization' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
}, schemaOptions);

export const ReportOutput = mongoose.model<IReportOutput>('ReportOutput', reportOutputSchema);
export default ReportOutput;

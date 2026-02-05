import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IReport extends Document {
  name: string;
  module: string;
  entity: string;
  tenant_id: mongoose.Types.ObjectId;
}

const reportSchema = new Schema({
  name: { type: String, required: true },
  module: { type: String, required: true },
  entity: { type: String, required: true },
  columns: [{
    field: { type: String },
    label: { type: String },
    type: { type: String },
    width: { type: Number },
  }],
  filters: [{
    field: { type: String },
    operator: { type: String },
    value: { type: Schema.Types.Mixed },
  }],
  group_by: [{ type: String }],
  sort_by: [{
    field: { type: String },
    direction: { type: String, enum: ['asc', 'desc'], default: 'asc' },
  }],
  chart_config: {
    type: { type: String, enum: ['bar', 'line', 'pie', 'donut', 'area', 'table'] },
    x_axis: { type: String },
    y_axis: { type: String },
    color: { type: String },
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String },
    recipients: [{ type: String }],
    last_sent_at: { type: Date },
  },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
}, schemaOptions);

reportSchema.index({ tenant_id: 1 });
reportSchema.index({ tenant_id: 1, module: 1 });
reportSchema.index({ created_by: 1 });

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
export default Report;

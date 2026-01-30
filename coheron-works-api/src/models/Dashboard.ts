import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const widgetSchema = new Schema({
  type: { type: String, enum: ['chart', 'metric', 'list', 'table', 'custom'] },
  report_id: { type: Schema.Types.ObjectId, ref: 'Report' },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    w: { type: Number, default: 4 },
    h: { type: Number, default: 3 },
  },
  config: { type: Schema.Types.Mixed },
  title: { type: String },
}, { _id: true });

export interface IDashboard extends Document {
  name: string;
  is_default: boolean;
  created_by: mongoose.Types.ObjectId;
  tenant_id: mongoose.Types.ObjectId;
}

const dashboardSchema = new Schema({
  name: { type: String, required: true },
  layout: { type: String, default: 'grid' },
  widgets: [widgetSchema],
  is_default: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  tenant_id: { type: Schema.Types.ObjectId, required: true },
}, schemaOptions);

dashboardSchema.index({ tenant_id: 1 });
dashboardSchema.index({ created_by: 1 });
dashboardSchema.index({ tenant_id: 1, is_default: 1 });

export const Dashboard = mongoose.model('Dashboard', dashboardSchema);
export default Dashboard;

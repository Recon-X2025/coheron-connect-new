import mongoose, { Schema, Document } from 'mongoose';

export interface IDashboard extends Document {
  tenant_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  name: string;
  layout: Array<{
    widget_id: string;
    type: 'kpi' | 'chart' | 'table' | 'list';
    title: string;
    config: Record<string, any>;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  is_default: boolean;
}

const widgetSchema = new Schema({
  widget_id: { type: String, required: true },
  type: { type: String, enum: ['kpi', 'chart', 'table', 'list'], required: true },
  title: { type: String, required: true },
  config: { type: Schema.Types.Mixed, default: {} },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  w: { type: Number, default: 4 },
  h: { type: Number, default: 3 },
}, { _id: false });

const schema = new Schema<IDashboard>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  layout: [widgetSchema],
  is_default: { type: Boolean, default: false },
}, { timestamps: true });

schema.index({ tenant_id: 1, user_id: 1 });

export default mongoose.model<IDashboard>('Dashboard', schema);

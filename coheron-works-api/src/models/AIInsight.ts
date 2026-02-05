import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IRelatedEntity { type: string; id: string; name: string; }

export interface IAIInsight extends Document {
  tenant_id: mongoose.Types.ObjectId;
  insight_type: 'anomaly' | 'trend' | 'recommendation' | 'forecast' | 'alert';
  module: 'sales' | 'accounting' | 'inventory' | 'hr' | 'crm';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data: any;
  related_entities: IRelatedEntity[];
  is_read: boolean;
  is_dismissed: boolean;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const relatedEntitySchema = new Schema({ type: { type: String, required: true }, id: { type: String, required: true }, name: { type: String, required: true } }, { _id: false });

const aiInsightSchema = new Schema<IAIInsight>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  insight_type: { type: String, enum: ['anomaly', 'trend', 'recommendation', 'forecast', 'alert'], required: true },
  module: { type: String, enum: ['sales', 'accounting', 'inventory', 'hr', 'crm'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  data: { type: Schema.Types.Mixed, default: {} },
  related_entities: { type: [relatedEntitySchema], default: [] },
  is_read: { type: Boolean, default: false },
  is_dismissed: { type: Boolean, default: false },
  expires_at: { type: Date, default: null },
}, schemaOptions);

aiInsightSchema.index({ tenant_id: 1, module: 1, is_dismissed: 1, created_at: -1 });
aiInsightSchema.index({ tenant_id: 1, insight_type: 1 });

export default mongoose.models.AIInsight as mongoose.Model<IAIInsight> || mongoose.model<IAIInsight>('AIInsight', aiInsightSchema);

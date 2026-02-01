import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface IAIQuery extends Document {
  tenant_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  query_text: string;
  query_type: 'natural_language' | 'anomaly_detection' | 'forecast' | 'recommendation' | 'summarize';
  context: { module?: string; entity_type?: string; entity_id?: string; date_range?: { start: Date; end: Date } };
  response_text: string;
  response_data: any;
  model_used: string;
  tokens_used: number;
  response_time_ms: number;
  feedback: 'helpful' | 'not_helpful' | null;
  created_at: Date;
  updated_at: Date;
}

const aiQuerySchema = new Schema<IAIQuery>({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  query_text: { type: String, required: true },
  query_type: { type: String, enum: ['natural_language', 'anomaly_detection', 'forecast', 'recommendation', 'summarize'], required: true },
  context: { module: { type: String }, entity_type: { type: String }, entity_id: { type: String }, date_range: { start: { type: Date }, end: { type: Date } } },
  response_text: { type: String, default: '' },
  response_data: { type: Schema.Types.Mixed, default: null },
  model_used: { type: String, default: 'rule-based' },
  tokens_used: { type: Number, default: 0 },
  response_time_ms: { type: Number, default: 0 },
  feedback: { type: String, enum: ['helpful', 'not_helpful', null], default: null },
}, schemaOptions);

aiQuerySchema.index({ tenant_id: 1, user_id: 1, created_at: -1 });
aiQuerySchema.index({ tenant_id: 1, query_type: 1 });

export default mongoose.model<IAIQuery>('AIQuery', aiQuerySchema);

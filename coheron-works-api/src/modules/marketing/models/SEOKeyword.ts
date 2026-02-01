import mongoose, { Schema, Document } from 'mongoose';

export interface ISEOKeyword extends Document {
  tenant_id: mongoose.Types.ObjectId;
  keyword: string;
  search_volume: number;
  difficulty: number;
  current_position: number;
  previous_position: number;
  position_change: number;
  target_url: string;
  status: 'tracking' | 'paused';
  cpc: number;
  competition: 'low' | 'medium' | 'high';
  last_checked_at: Date;
  created_at: Date;
  updated_at: Date;
}

const seoKeywordSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  keyword: { type: String, required: true },
  search_volume: { type: Number, default: 0 },
  difficulty: { type: Number, min: 0, max: 100, default: 0 },
  current_position: { type: Number, default: 0 },
  previous_position: { type: Number, default: 0 },
  position_change: { type: Number, default: 0 },
  target_url: { type: String, default: '' },
  status: { type: String, enum: ['tracking', 'paused'], default: 'tracking' },
  cpc: { type: Number, default: 0 },
  competition: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  last_checked_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

seoKeywordSchema.index({ tenant_id: 1, keyword: 1 });

export const SEOKeyword = mongoose.model<ISEOKeyword>('SEOKeyword', seoKeywordSchema);

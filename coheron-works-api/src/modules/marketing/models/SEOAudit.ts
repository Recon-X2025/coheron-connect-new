import mongoose, { Schema, Document } from 'mongoose';

export interface ISEOAudit extends Document {
  tenant_id: mongoose.Types.ObjectId;
  url: string;
  audit_date: Date;
  scores: {
    overall: number;
    performance: number;
    seo: number;
    accessibility: number;
    best_practices: number;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    category: 'meta' | 'content' | 'links' | 'images' | 'speed';
    description: string;
    element: string;
    recommendation: string;
  }>;
  page_speed: {
    mobile: number;
    desktop: number;
  };
  status: 'pending' | 'completed' | 'failed';
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const seoAuditSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  url: { type: String, required: true },
  audit_date: { type: Date, default: Date.now },
  scores: {
    overall: { type: Number, default: 0 },
    performance: { type: Number, default: 0 },
    seo: { type: Number, default: 0 },
    accessibility: { type: Number, default: 0 },
    best_practices: { type: Number, default: 0 },
  },
  issues: [{
    type: { type: String, enum: ['error', 'warning', 'info'] },
    category: { type: String, enum: ['meta', 'content', 'links', 'images', 'speed'] },
    description: String,
    element: String,
    recommendation: String,
  }],
  page_speed: {
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
  },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

seoAuditSchema.index({ tenant_id: 1, url: 1 });

export const SEOAudit = mongoose.model<ISEOAudit>('SEOAudit', seoAuditSchema);

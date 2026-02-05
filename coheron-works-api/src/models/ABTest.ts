import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const abTestSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId },
  campaign_id: { type: Schema.Types.ObjectId },
  name: { type: String, required: true },
  test_type: { type: String, enum: ['subject_line', 'content', 'send_time', 'cta'], required: true },
  status: { type: String, enum: ['draft', 'running', 'completed', 'cancelled'], default: 'draft' },
  variants: [{
    name: { type: String },
    content: { type: String },
    subject: { type: String },
    send_time: { type: Date },
    audience_pct: { type: Number },
    emails_sent: { type: Number, default: 0 },
    opens: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  }],
  winner_variant: { type: String },
  winning_metric: { type: String, enum: ['open_rate', 'click_rate', 'conversion_rate'] },
  confidence_level: { type: Number },
  total_audience: { type: Number },
  start_date: { type: Date },
  end_date: { type: Date },
  auto_select_winner: { type: Boolean, default: false },
  auto_select_after_hours: { type: Number },
  created_by: { type: Schema.Types.ObjectId },
}, schemaOptions);

abTestSchema.index({ tenant_id: 1, campaign_id: 1 });
abTestSchema.index({ tenant_id: 1, status: 1 });

export const ABTest = mongoose.models.ABTest || mongoose.model('ABTest', abTestSchema);

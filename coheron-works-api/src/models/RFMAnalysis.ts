import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const customerRFMSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  customer_id: { type: Schema.Types.ObjectId, required: true },
  customer_type: { type: String, enum: ['contact', 'partner', 'company'], required: true },

  // Raw values
  recency_days: { type: Number, required: true },
  frequency_count: { type: Number, required: true },
  monetary_total: { type: Number, required: true },
  monetary_average: { type: Number, required: true },

  // Scores (1-5)
  recency_score: { type: Number, min: 1, max: 5, required: true },
  frequency_score: { type: Number, min: 1, max: 5, required: true },
  monetary_score: { type: Number, min: 1, max: 5, required: true },

  // Combined
  rfm_score: { type: String, required: true },
  rfm_total: { type: Number, min: 3, max: 15, required: true },

  // Segment
  segment: { type: String, required: true },
  segment_code: { type: String, required: true },

  // Customer details (denormalized)
  customer_name: { type: String },
  customer_email: { type: String },
  customer_phone: { type: String },

  // Analysis period
  analysis_period: {
    start_date: { type: Date },
    end_date: { type: Date },
    period_type: { type: String, enum: ['all_time', 'yearly', 'quarterly', 'monthly', 'custom'] },
  },

  // Transaction summary
  transactions: {
    first_purchase_date: { type: Date },
    last_purchase_date: { type: Date },
    total_orders: { type: Number },
    total_items: { type: Number },
    total_revenue: { type: Number },
    average_order_value: { type: Number },
    max_order_value: { type: Number },
    min_order_value: { type: Number },
  },

  // Trends
  trends: {
    revenue_trend: { type: String, enum: ['increasing', 'stable', 'decreasing'] },
    frequency_trend: { type: String, enum: ['increasing', 'stable', 'decreasing'] },
    aov_trend: { type: String, enum: ['increasing', 'stable', 'decreasing'] },
    last_3_months_revenue: { type: Number },
    previous_3_months_revenue: { type: Number },
    growth_rate: { type: Number },
  },

  // Predictions
  predictions: {
    churn_risk: { type: String, enum: ['high', 'medium', 'low'] },
    churn_probability: { type: Number, min: 0, max: 100 },
    predicted_next_purchase: { type: Date },
    predicted_clv: { type: Number },
    predicted_annual_value: { type: Number },
  },

  // Recommendations
  recommendations: {
    action: { type: String },
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    suggested_campaign: { type: String },
    suggested_offer: { type: String },
  },

  calculated_at: { type: Date, default: Date.now },
  calculation_version: { type: String, default: '1.0' },
}, schemaOptions);

customerRFMSchema.index({ tenant_id: 1, customer_id: 1 }, { unique: true });
customerRFMSchema.index({ tenant_id: 1, segment: 1 });
customerRFMSchema.index({ tenant_id: 1, rfm_score: 1 });
customerRFMSchema.index({ tenant_id: 1, 'predictions.churn_risk': 1 });

const rfmAnalysisRunSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  config: {
    period_type: { type: String, enum: ['all_time', 'yearly', 'quarterly', 'monthly', 'custom'], default: 'yearly' },
    start_date: { type: Date },
    end_date: { type: Date },
    customer_type: { type: String, enum: ['all', 'contact', 'partner', 'company'], default: 'all' },
    min_transactions: { type: Number, default: 1 },
    exclude_refunds: { type: Boolean, default: true },
  },
  scoring: {
    method: { type: String, enum: ['quintile', 'fixed_ranges', 'custom'], default: 'quintile' },
    recency_ranges: [Number],
    frequency_ranges: [Number],
    monetary_ranges: [Number],
  },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  started_at: { type: Date },
  completed_at: { type: Date },
  error: { type: String },
  summary: {
    total_customers: { type: Number },
    customers_analyzed: { type: Number },
    customers_excluded: { type: Number },
    segments: [{
      segment: String,
      count: Number,
      percentage: Number,
      total_revenue: Number,
      avg_rfm_score: Number,
    }],
    score_distribution: [{
      rfm_score: String,
      count: Number,
    }],
    total_revenue: { type: Number },
    avg_order_value: { type: Number },
    avg_frequency: { type: Number },
    avg_recency_days: { type: Number },
  },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

rfmAnalysisRunSchema.index({ tenant_id: 1 });

export const CustomerRFM = mongoose.model('CustomerRFM', customerRFMSchema);
export const RFMAnalysisRun = mongoose.model('RFMAnalysisRun', rfmAnalysisRunSchema);

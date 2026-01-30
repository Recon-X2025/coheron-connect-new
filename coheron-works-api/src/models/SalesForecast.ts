import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const forecastLineSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  opportunity_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  forecasted_amount: { type: Number },
  forecasted_quantity: { type: Number },
  probability: { type: Number },
});

const salesForecastSchema = new Schema({
  forecast_name: { type: String },
  forecast_type: { type: String },
  period_type: { type: String },
  period_start: { type: Date },
  period_end: { type: Date },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  territory_id: { type: Schema.Types.ObjectId },
  forecasted_amount: { type: Number },
  forecasted_quantity: { type: Number },
  actual_amount: { type: Number },
  actual_quantity: { type: Number },
  confidence_level: { type: Number },
  forecast_method: { type: String, default: 'manual' },
  notes: { type: String },
  forecast_lines: [forecastLineSchema],
}, schemaOptions);

const salesTargetSchema = new Schema({
  target_name: { type: String },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  team_id: { type: Schema.Types.ObjectId, ref: 'SalesTeam' },
  territory_id: { type: Schema.Types.ObjectId },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  period_type: { type: String },
  period_start: { type: Date },
  period_end: { type: Date },
  revenue_target: { type: Number },
  quantity_target: { type: Number },
  deal_count_target: { type: Number },
  achievement_revenue: { type: Number, default: 0 },
  achievement_quantity: { type: Number, default: 0 },
  achievement_deal_count: { type: Number, default: 0 },
}, schemaOptions);

// SalesForecast indexes
salesForecastSchema.index({ user_id: 1 });
salesForecastSchema.index({ territory_id: 1 });
salesForecastSchema.index({ forecast_type: 1 });
salesForecastSchema.index({ period_start: 1, period_end: 1 });

// SalesTarget indexes
salesTargetSchema.index({ user_id: 1 });
salesTargetSchema.index({ team_id: 1 });
salesTargetSchema.index({ territory_id: 1 });
salesTargetSchema.index({ product_id: 1 });
salesTargetSchema.index({ period_start: 1, period_end: 1 });

export const SalesForecast = mongoose.model('SalesForecast', salesForecastSchema);
export const SalesTarget = mongoose.model('SalesTarget', salesTargetSchema);

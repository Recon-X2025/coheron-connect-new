import mongoose, { Schema, Document } from 'mongoose';

export interface IDemandForecast extends Document {
  tenant_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  period_start: Date;
  period_end: Date;
  forecast_quantity: number;
  actual_quantity: number;
  method: 'moving_average' | 'exponential_smoothing' | 'seasonal' | 'manual';
  confidence_level: number;
  planning_run_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const demandForecastSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  forecast_quantity: { type: Number, required: true, default: 0 },
  actual_quantity: { type: Number, default: 0 },
  method: { type: String, enum: ['moving_average', 'exponential_smoothing', 'seasonal', 'manual'], default: 'moving_average' },
  confidence_level: { type: Number, default: 0.8 },
  planning_run_id: { type: Schema.Types.ObjectId, ref: 'DemandPlanningRun' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

demandForecastSchema.index({ tenant_id: 1, product_id: 1, period_start: 1 });
demandForecastSchema.index({ tenant_id: 1, planning_run_id: 1 });

export const DemandForecast = mongoose.model<IDemandForecast>('DemandForecast', demandForecastSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ISPCMeasurement extends Document {
  tenant_id: string;
  inspection_plan_id: mongoose.Types.ObjectId;
  checkpoint_index: number;
  product_id: mongoose.Types.ObjectId;
  batch_number: string;
  measured_value: number;
  measured_by: mongoose.Types.ObjectId;
  measured_at: Date;
  in_spec: boolean;
  control_chart_data: {
    ucl: number;
    lcl: number;
    mean: number;
    range: number;
  };
}

const spcMeasurementSchema = new Schema<ISPCMeasurement>(
  {
    tenant_id: { type: String, required: true, index: true },
    inspection_plan_id: { type: Schema.Types.ObjectId, ref: 'InspectionPlan', required: true, index: true },
    checkpoint_index: { type: Number, required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    batch_number: String,
    measured_value: { type: Number, required: true },
    measured_by: { type: Schema.Types.ObjectId, ref: 'User' },
    measured_at: { type: Date, default: Date.now },
    in_spec: { type: Boolean, default: true },
    control_chart_data: {
      ucl: Number,
      lcl: Number,
      mean: Number,
      range: Number,
    },
  },
  defaultSchemaOptions
);

spcMeasurementSchema.index({ inspection_plan_id: 1, checkpoint_index: 1, measured_at: 1 });

export const SPCMeasurement = mongoose.model<ISPCMeasurement>('SPCMeasurement', spcMeasurementSchema);

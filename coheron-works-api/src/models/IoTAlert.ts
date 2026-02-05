import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const iotAlertSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  device_id: { type: Schema.Types.ObjectId, ref: 'IoTDevice', required: true },
  alert_type: {
    type: String,
    enum: ['threshold_breach', 'device_offline', 'anomaly', 'maintenance_due'],
    required: true,
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  metric_name: { type: String },
  threshold_value: { type: Number },
  actual_value: { type: Number },
  message: { type: String, required: true },
  is_acknowledged: { type: Boolean, default: false },
  acknowledged_by: { type: Schema.Types.ObjectId, ref: 'User' },
  acknowledged_at: { type: Date },
  resolved_at: { type: Date },
}, schemaOptions);

iotAlertSchema.index({ tenant_id: 1, is_acknowledged: 1, created_at: -1 });
iotAlertSchema.index({ tenant_id: 1, device_id: 1 });

export default mongoose.models.IoTAlert || mongoose.model('IoTAlert', iotAlertSchema);

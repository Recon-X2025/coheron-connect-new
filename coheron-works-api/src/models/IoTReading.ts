import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const iotReadingSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  device_id: { type: Schema.Types.ObjectId, ref: 'IoTDevice', required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  metrics: { type: Schema.Types.Mixed, required: true },
  anomaly_detected: { type: Boolean, default: false },
  anomaly_details: { type: String },
}, schemaOptions);

iotReadingSchema.index({ tenant_id: 1, device_id: 1, timestamp: 1 });
iotReadingSchema.index({ tenant_id: 1, anomaly_detected: 1 });
iotReadingSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('IoTReading', iotReadingSchema);

import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const iotDeviceSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  device_id: { type: String, required: true },
  device_type: {
    type: String,
    enum: ['sensor', 'plc', 'cnc', 'printer', 'scale', 'rfid_reader', 'temperature', 'humidity', 'power_meter'],
    required: true,
  },
  work_center_id: { type: Schema.Types.ObjectId, ref: 'WorkCenter' },
  manufacturer: { type: String },
  model: { type: String },
  serial_number: { type: String },
  protocol: { type: String, enum: ['mqtt', 'http', 'modbus', 'opcua'], default: 'mqtt' },
  connection_config: {
    host: { type: String },
    port: { type: Number },
    topic: { type: String },
    path: { type: String },
    credentials: { type: Schema.Types.Mixed },
  },
  status: { type: String, enum: ['online', 'offline', 'error', 'maintenance'], default: 'offline' },
  last_heartbeat_at: { type: Date },
  metrics_config: [{
    metric_name: { type: String, required: true },
    unit: { type: String },
    min_threshold: { type: Number },
    max_threshold: { type: Number },
    alert_on_breach: { type: Boolean, default: true },
  }],
  is_active: { type: Boolean, default: true },
}, schemaOptions);

iotDeviceSchema.index({ tenant_id: 1, device_id: 1 }, { unique: true });
iotDeviceSchema.index({ tenant_id: 1, work_center_id: 1 });
iotDeviceSchema.index({ tenant_id: 1, status: 1 });

export default mongoose.models.IoTDevice || mongoose.model('IoTDevice', iotDeviceSchema);

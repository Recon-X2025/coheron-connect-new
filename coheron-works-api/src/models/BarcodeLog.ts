import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const barcodeLogSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  barcode_value: { type: String, required: true },
  barcode_type: { type: String, enum: ['product', 'serial', 'batch', 'bin', 'package'], required: true },
  reference_type: { type: String, enum: ['product', 'serial_number', 'batch', 'bin_location', 'package'], required: true },
  reference_id: { type: Schema.Types.ObjectId, required: true },
  scanned_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scanned_at: { type: Date, default: Date.now },
  action: { type: String, enum: ['receive', 'pick', 'pack', 'ship', 'transfer', 'count'], required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  notes: { type: String },
}, schemaOptions);

barcodeLogSchema.index({ tenant_id: 1, scanned_at: -1 });
barcodeLogSchema.index({ tenant_id: 1, barcode_value: 1 });
barcodeLogSchema.index({ reference_id: 1 });

export const BarcodeLog = mongoose.models.BarcodeLog || mongoose.model('BarcodeLog', barcodeLogSchema);

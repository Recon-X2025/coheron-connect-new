import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IPosTerminal extends Document {
  name: string;
  code: string;
  store_id: mongoose.Types.ObjectId;
  is_active: boolean;
  printer_id: string;
  cash_drawer_enabled: boolean;
  barcode_scanner_enabled: boolean;
  hardware_config: any;
}

const posTerminalSchema = new Schema<IPosTerminal>({
  name: { type: String, required: true },
  code: { type: String, unique: true },
  store_id: { type: Schema.Types.ObjectId, ref: 'Store' },
  is_active: { type: Boolean, default: true },
  printer_id: { type: String },
  cash_drawer_enabled: { type: Boolean, default: true },
  barcode_scanner_enabled: { type: Boolean, default: true },
  hardware_config: { type: Schema.Types.Mixed },
}, defaultSchemaOptions);

// Indexes
posTerminalSchema.index({ store_id: 1 });
posTerminalSchema.index({ is_active: 1 });

export default mongoose.models.PosTerminal as mongoose.Model<IPosTerminal> || mongoose.model<IPosTerminal>('PosTerminal', posTerminalSchema);

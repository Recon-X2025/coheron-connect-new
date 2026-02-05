import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IInventorySettings extends Document {
  default_removal_strategy: string;
  default_cost_method: string;
  auto_create_lots: boolean;
  auto_assign_lots: boolean;
  require_qc_on_grn: boolean;
  require_approval_for_adjustments: boolean;
  adjustment_approval_threshold: number;
  enable_abc_analysis: boolean;
  enable_cycle_counting: boolean;
  cycle_count_frequency_days: number;
}

const inventorySettingsSchema = new Schema<IInventorySettings>({
  default_removal_strategy: { type: String, default: 'fifo' },
  default_cost_method: { type: String, default: 'fifo' },
  auto_create_lots: { type: Boolean, default: false },
  auto_assign_lots: { type: Boolean, default: false },
  require_qc_on_grn: { type: Boolean, default: false },
  require_approval_for_adjustments: { type: Boolean, default: true },
  adjustment_approval_threshold: { type: Number, default: 10000 },
  enable_abc_analysis: { type: Boolean, default: true },
  enable_cycle_counting: { type: Boolean, default: true },
  cycle_count_frequency_days: { type: Number, default: 30 },
}, defaultSchemaOptions);

export default mongoose.models.InventorySettings as mongoose.Model<IInventorySettings> || mongoose.model<IInventorySettings>('InventorySettings', inventorySettingsSchema);

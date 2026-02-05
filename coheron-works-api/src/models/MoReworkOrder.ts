import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface IMoReworkOrder extends Document {
  mo_id: mongoose.Types.ObjectId;
  ncr_id: mongoose.Types.ObjectId;
  name: string;
  product_id: mongoose.Types.ObjectId;
  qty_to_rework: number;
  workorder_id: mongoose.Types.ObjectId;
  state: string;
  date_planned_start: Date;
  date_planned_finished: Date;
  notes: string;
}

const schema = new Schema<IMoReworkOrder>({
  mo_id: { type: Schema.Types.ObjectId, ref: 'ManufacturingOrder' },
  ncr_id: { type: Schema.Types.ObjectId, ref: 'MoNonConformance' },
  name: { type: String },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  qty_to_rework: { type: Number, default: 0 },
  workorder_id: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  state: { type: String, default: 'draft' },
  date_planned_start: { type: Date },
  date_planned_finished: { type: Date },
  notes: { type: String },
}, defaultSchemaOptions);

schema.index({ mo_id: 1 });
schema.index({ ncr_id: 1 });
schema.index({ product_id: 1 });
schema.index({ workorder_id: 1 });
schema.index({ state: 1 });
schema.index({ mo_id: 1, state: 1 });

export default mongoose.models.MoReworkOrder as mongoose.Model<IMoReworkOrder> || mongoose.model<IMoReworkOrder>('MoReworkOrder', schema);

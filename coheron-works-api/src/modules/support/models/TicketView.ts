import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

export interface ITicketView extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  visibility: string;
  owner_id: mongoose.Types.ObjectId;
  conditions: {
    all: { field: string; operator: string; value: any }[];
    any: { field: string; operator: string; value: any }[];
  };
  columns: string[];
  sort_by: string;
  sort_order: string;
  group_by?: string;
  auto_refresh_seconds?: number;
  is_default: boolean;
  position: number;
}

const conditionSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
}, { _id: false });

const ticketViewSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  visibility: { type: String, enum: ['personal', 'shared', 'global'], default: 'personal' },
  owner_id: { type: Schema.Types.ObjectId, ref: 'User' },
  conditions: {
    all: [conditionSchema],
    any: [conditionSchema],
  },
  columns: [{ type: String }],
  sort_by: { type: String, default: 'created_at' },
  sort_order: { type: String, enum: ['asc', 'desc'], default: 'desc' },
  group_by: { type: String },
  auto_refresh_seconds: { type: Number },
  is_default: { type: Boolean, default: false },
  position: { type: Number, default: 0 },
}, defaultSchemaOptions);

ticketViewSchema.index({ tenant_id: 1, owner_id: 1 });
ticketViewSchema.index({ tenant_id: 1, visibility: 1 });

export const TicketView = mongoose.model<ITicketView>('TicketView', ticketViewSchema);
export default TicketView;

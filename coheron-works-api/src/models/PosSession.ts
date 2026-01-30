import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IPosSession extends Document {
  name: string;
  session_number: string;
  store_id: mongoose.Types.ObjectId;
  terminal_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  state: string;
  opening_balance: number;
  closing_balance: number;
  expected_balance: number;
  difference: number;
  total_orders: number;
  total_sales: number;
  total_cash: number;
  total_card: number;
  total_upi: number;
  total_other: number;
  start_at: Date;
  stop_at: Date;
  notes: string;
}

const posSessionSchema = new Schema<IPosSession>({
  name: { type: String },
  session_number: { type: String, unique: true },
  store_id: { type: Schema.Types.ObjectId, ref: 'Store' },
  terminal_id: { type: Schema.Types.ObjectId, ref: 'PosTerminal' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  state: { type: String, default: 'opening' },
  opening_balance: { type: Number, default: 0 },
  closing_balance: { type: Number },
  expected_balance: { type: Number },
  difference: { type: Number },
  total_orders: { type: Number },
  total_sales: { type: Number },
  total_cash: { type: Number },
  total_card: { type: Number },
  total_upi: { type: Number },
  total_other: { type: Number },
  start_at: { type: Date },
  stop_at: { type: Date },
  notes: { type: String },
}, defaultSchemaOptions);

// Indexes
posSessionSchema.index({ store_id: 1 });
posSessionSchema.index({ terminal_id: 1 });
posSessionSchema.index({ user_id: 1 });
posSessionSchema.index({ state: 1 });
posSessionSchema.index({ start_at: -1 });
posSessionSchema.index({ store_id: 1, state: 1 });

export default mongoose.model<IPosSession>('PosSession', posSessionSchema);

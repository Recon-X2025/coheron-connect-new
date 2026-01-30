import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../utils/mongoose-helpers.js';

export interface IStockIssueLine {
  product_id: mongoose.Types.ObjectId;
  product_uom_id: mongoose.Types.ObjectId;
  quantity: number;
  lot_id: mongoose.Types.ObjectId;
}

export interface IStockIssue extends Document {
  issue_number: string;
  issue_type: string;
  from_warehouse_id: mongoose.Types.ObjectId;
  to_entity_id: mongoose.Types.ObjectId;
  issue_date: Date;
  issued_by: mongoose.Types.ObjectId;
  approved_by: mongoose.Types.ObjectId;
  state: string;
  notes: string;
  lines: IStockIssueLine[];
}

const stockIssueLineSchema = new Schema<IStockIssueLine>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  product_uom_id: { type: Schema.Types.ObjectId },
  quantity: { type: Number, required: true },
  lot_id: { type: Schema.Types.ObjectId, ref: 'StockProductionLot' },
}, { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const stockIssueSchema = new Schema<IStockIssue>({
  issue_number: { type: String, required: true, unique: true },
  issue_type: { type: String },
  from_warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  to_entity_id: { type: Schema.Types.ObjectId },
  issue_date: { type: Date, default: Date.now },
  issued_by: { type: Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  state: { type: String, default: 'draft' },
  notes: { type: String },
  lines: [stockIssueLineSchema],
}, defaultSchemaOptions);

stockIssueSchema.index({ issue_number: 1 }, { unique: true });
stockIssueSchema.index({ state: 1 });
stockIssueSchema.index({ issue_date: -1 });
stockIssueSchema.index({ from_warehouse_id: 1 });
stockIssueSchema.index({ to_entity_id: 1 });
stockIssueSchema.index({ issue_type: 1 });
stockIssueSchema.index({ state: 1, issue_date: -1 });

export default mongoose.model<IStockIssue>('StockIssue', stockIssueSchema);

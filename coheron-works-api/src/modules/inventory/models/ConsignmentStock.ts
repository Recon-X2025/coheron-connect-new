import mongoose, { Schema, Document } from 'mongoose';

export interface IConsignmentStock extends Document {
  tenant_id: mongoose.Types.ObjectId;
  agreement_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  warehouse_id: mongoose.Types.ObjectId;
  quantity_on_hand: number;
  quantity_sold: number;
  quantity_returned: number;
  last_reconciled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const consignmentStockSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  agreement_id: { type: Schema.Types.ObjectId, ref: 'ConsignmentAgreement', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity_on_hand: { type: Number, default: 0 },
  quantity_sold: { type: Number, default: 0 },
  quantity_returned: { type: Number, default: 0 },
  last_reconciled_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

consignmentStockSchema.index({ tenant_id: 1, agreement_id: 1, product_id: 1 }, { unique: true });

export const ConsignmentStock = mongoose.model<IConsignmentStock>('ConsignmentStock', consignmentStockSchema);

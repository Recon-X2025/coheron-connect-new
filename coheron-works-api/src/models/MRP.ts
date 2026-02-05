import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

// MRP Run
const mrpRunSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  config: {
    horizon_days: { type: Number, default: 30 },
    include_sales_orders: { type: Boolean, default: true },
    include_sales_forecasts: { type: Boolean, default: false },
    include_safety_stock: { type: Boolean, default: true },
    include_min_stock: { type: Boolean, default: true },
    consolidate_demands: { type: Boolean, default: true },
    respect_lot_sizes: { type: Boolean, default: true },
  },
  filters: {
    product_ids: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    product_categories: [String],
    warehouse_ids: [{ type: Schema.Types.ObjectId, ref: 'Warehouse' }],
  },
  status: { type: String, enum: ['draft', 'running', 'completed', 'failed', 'cancelled'], default: 'draft' },
  started_at: { type: Date },
  completed_at: { type: Date },
  error: { type: String },
  summary: {
    products_analyzed: Number,
    demands_found: Number,
    supply_found: Number,
    planned_manufacturing_orders: Number,
    planned_purchase_orders: Number,
    total_planned_value: Number,
  },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

mrpRunSchema.index({ tenant_id: 1, status: 1 });

// MRP Demand
const mrpDemandSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  run_id: { type: Schema.Types.ObjectId, ref: 'MRPRun', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  source_type: { type: String, enum: ['sale_order', 'manufacturing_order', 'forecast', 'safety_stock', 'min_stock', 'manual'], required: true },
  source_id: { type: Schema.Types.ObjectId },
  source_ref: String,
  quantity_required: { type: Number, required: true },
  quantity_available: { type: Number, default: 0 },
  quantity_incoming: { type: Number, default: 0 },
  quantity_shortage: { type: Number, default: 0 },
  required_date: { type: Date, required: true },
  resolved: { type: Boolean, default: false },
  resolved_by: { type: String, enum: ['manufacturing', 'purchase', 'stock', 'manual'] },
  planned_order_id: { type: Schema.Types.ObjectId },
}, schemaOptions);

mrpDemandSchema.index({ tenant_id: 1, run_id: 1, resolved: 1 });

// MRP Planned Order
const mrpPlannedOrderSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  run_id: { type: Schema.Types.ObjectId, ref: 'MRPRun', required: true },
  order_type: { type: String, enum: ['manufacturing', 'purchase'], required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name: String,
  quantity: { type: Number, required: true },
  uom: String,
  required_date: { type: Date, required: true },
  planned_start_date: { type: Date, required: true },
  planned_end_date: { type: Date, required: true },
  lead_time_days: { type: Number, default: 0 },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  supplier_id: { type: Schema.Types.ObjectId, ref: 'Partner' },
  bom_id: { type: Schema.Types.ObjectId, ref: 'Bom' },
  estimated_cost: { type: Number, default: 0 },
  status: { type: String, enum: ['planned', 'confirmed', 'cancelled'], default: 'planned' },
  confirmed_order_id: { type: Schema.Types.ObjectId },
  confirmed_at: { type: Date },
  confirmed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  demand_ids: [{ type: Schema.Types.ObjectId, ref: 'MRPDemand' }],
}, schemaOptions);

mrpPlannedOrderSchema.index({ tenant_id: 1, run_id: 1, status: 1 });

export const MRPRun = mongoose.models.MRPRun || mongoose.model('MRPRun', mrpRunSchema);
export const MRPDemand = mongoose.models.MRPDemand || mongoose.model('MRPDemand', mrpDemandSchema);
export const MRPPlannedOrder = mongoose.models.MRPPlannedOrder || mongoose.model('MRPPlannedOrder', mrpPlannedOrderSchema);

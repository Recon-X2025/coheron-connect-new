import mongoose, { Schema, Document } from 'mongoose';

export interface IECOItem {
  item_type: 'bom' | 'routing' | 'product' | 'document';
  reference_id: mongoose.Types.ObjectId;
  change_type: 'add' | 'modify' | 'remove' | 'replace';
  current_value?: any;
  proposed_value?: any;
  description: string;
}

export interface IEngineeringChangeOrder extends Document {
  tenant_id: mongoose.Types.ObjectId;
  eco_number: string;
  title: string;
  description: string;
  reason: 'cost_reduction' | 'quality_improvement' | 'regulatory' | 'customer_request' | 'design_error' | 'other';
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'draft' | 'review' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  product_id: mongoose.Types.ObjectId;
  current_revision: string;
  new_revision: string;
  items: IECOItem[];
  requested_by: mongoose.Types.ObjectId;
  reviewers: { user_id: mongoose.Types.ObjectId; status: string; reviewed_at?: Date; comments?: string }[];
  approved_by?: mongoose.Types.ObjectId;
  effective_date?: Date;
  implementation_notes?: string;
  attachments: { name: string; url: string; uploaded_at: Date }[];
  created_at: Date;
  updated_at: Date;
}

const ecoItemSchema = new Schema({
  item_type: { type: String, enum: ['bom', 'routing', 'product', 'document'], required: true },
  reference_id: { type: Schema.Types.ObjectId, required: true },
  change_type: { type: String, enum: ['add', 'modify', 'remove', 'replace'], required: true },
  current_value: Schema.Types.Mixed,
  proposed_value: Schema.Types.Mixed,
  description: { type: String, required: true },
}, { _id: false });

const reviewerSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewed_at: Date,
  comments: String,
}, { _id: false });

const engineeringChangeOrderSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  eco_number: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  reason: { type: String, enum: ['cost_reduction', 'quality_improvement', 'regulatory', 'customer_request', 'design_error', 'other'], required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
  status: { type: String, enum: ['draft', 'review', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled'], default: 'draft' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  current_revision: { type: String, required: true },
  new_revision: { type: String, required: true },
  items: [ecoItemSchema],
  requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewers: [reviewerSchema],
  approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
  effective_date: Date,
  implementation_notes: String,
  attachments: [{ name: String, url: String, uploaded_at: Date }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

engineeringChangeOrderSchema.index({ tenant_id: 1, eco_number: 1 }, { unique: true });

export const EngineeringChangeOrder = mongoose.model<IEngineeringChangeOrder>('EngineeringChangeOrder', engineeringChangeOrderSchema);

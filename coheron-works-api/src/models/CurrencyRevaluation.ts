import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const currencyRevaluationSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  revaluation_date: { type: Date, required: true },
  base_currency: { type: String, required: true },
  accounts_revalued: [{
    account_id: { type: Schema.Types.ObjectId, required: true },
    account_name: { type: String },
    currency: { type: String, required: true },
    original_amount: { type: Number, required: true },
    original_rate: { type: Number, required: true },
    new_rate: { type: Number, required: true },
    original_base_amount: { type: Number, required: true },
    new_base_amount: { type: Number, required: true },
    gain_loss: { type: Number, required: true },
  }],
  total_unrealized_gain: { type: Number, default: 0 },
  total_unrealized_loss: { type: Number, default: 0 },
  net_gain_loss: { type: Number, default: 0 },
  journal_entry_id: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  status: { type: String, enum: ['draft', 'posted'], default: 'draft' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, schemaOptions);

currencyRevaluationSchema.index({ tenant_id: 1, revaluation_date: 1 });

export default mongoose.model('CurrencyRevaluation', currencyRevaluationSchema);

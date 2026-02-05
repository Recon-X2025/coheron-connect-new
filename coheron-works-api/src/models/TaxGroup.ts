import mongoose, { Schema, Document } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

export interface ITaxGroup extends Document {
  name: string;
  active: boolean;
}

const TaxGroupSchema = new Schema<ITaxGroup>({
  name: { type: String, required: true },
  active: { type: Boolean, default: true },
}, schemaOptions);

// Indexes
TaxGroupSchema.index({ active: 1 });

export default mongoose.models.TaxGroup as mongoose.Model<ITaxGroup> || mongoose.model<ITaxGroup>('TaxGroup', TaxGroupSchema);

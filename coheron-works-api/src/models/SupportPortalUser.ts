import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportPortalUser extends Document {
  tenant_id: string;
  partner_id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  name: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

const SupportPortalUserSchema = new Schema<ISupportPortalUser>(
  {
    tenant_id: { type: String, required: true },
    partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
    email: { type: String, required: true },
    password_hash: { type: String, required: true },
    name: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    last_login: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

SupportPortalUserSchema.index({ tenant_id: 1, email: 1 }, { unique: true });

export default mongoose.models.SupportPortalUser as mongoose.Model<ISupportPortalUser> || mongoose.model<ISupportPortalUser>('SupportPortalUser', SupportPortalUserSchema);

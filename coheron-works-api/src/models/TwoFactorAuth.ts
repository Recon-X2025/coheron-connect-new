import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const twoFactorAuthSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  method: { type: String, enum: ['totp', 'sms', 'email'], required: true },
  secret: { type: String },
  backup_codes: [{
    code: { type: String },
    used: { type: Boolean, default: false },
    used_at: { type: Date },
  }],
  is_verified: { type: Boolean, default: false },
  verified_at: { type: Date },
  last_used_at: { type: Date },
  phone_number: { type: String },
  email: { type: String },
  otp_code: { type: String },
  otp_expires_at: { type: Date },
}, schemaOptions);

twoFactorAuthSchema.index({ user_id: 1 }, { unique: true });

export const TwoFactorAuth = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);

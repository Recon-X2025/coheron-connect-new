import mongoose, { Schema, Document } from 'mongoose';
import { defaultSchemaOptions } from '../shared/utils/mongoose-helpers.js';

export interface ISSOProvider extends Document {
  tenant_id: mongoose.Types.ObjectId;
  provider_name: 'google' | 'microsoft' | 'okta' | 'custom_oauth' | 'custom_saml';
  client_id: string;
  client_secret: string;
  authorization_url: string;
  token_url: string;
  userinfo_url: string;
  callback_url: string;
  scopes: string[];
  saml_entry_point: string;
  saml_issuer: string;
  saml_cert: string;
  attribute_mapping: {
    email: string;
    name: string;
    first_name: string;
    last_name: string;
    [key: string]: string;
  };
  enabled: boolean;
  auto_create_users: boolean;
  default_role_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ssoProviderSchema = new Schema<ISSOProvider>(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    provider_name: {
      type: String,
      required: true,
      enum: ['google', 'microsoft', 'okta', 'custom_oauth', 'custom_saml'],
    },
    client_id: { type: String },
    client_secret: { type: String },
    authorization_url: { type: String },
    token_url: { type: String },
    userinfo_url: { type: String },
    callback_url: { type: String, required: true },
    scopes: [{ type: String }],
    saml_entry_point: { type: String },
    saml_issuer: { type: String },
    saml_cert: { type: String },
    attribute_mapping: {
      type: Schema.Types.Mixed,
      default: { email: 'email', name: 'name', first_name: 'given_name', last_name: 'family_name' },
    },
    enabled: { type: Boolean, default: true },
    auto_create_users: { type: Boolean, default: false },
    default_role_id: { type: Schema.Types.ObjectId },
  },
  defaultSchemaOptions,
);

ssoProviderSchema.index({ tenant_id: 1, provider_name: 1 }, { unique: true });

export const SSOProvider = mongoose.model<ISSOProvider>('SSOProvider', ssoProviderSchema);
export default SSOProvider;

import mongoose, { Schema } from 'mongoose';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } },
  toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; return ret; } }
};

const ssoConfigSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true },
  provider: { type: String, enum: ['saml', 'oidc', 'google', 'microsoft', 'okta', 'auth0'], required: true },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: false },

  saml: {
    entity_id: String,
    sso_url: String,
    slo_url: String,
    certificate: String,
    private_key: String,
    signature_algorithm: { type: String, default: 'sha256' },
    digest_algorithm: { type: String, default: 'sha256' },
    name_id_format: { type: String, default: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' },
    attribute_mapping: {
      email: { type: String, default: 'email' },
      first_name: { type: String, default: 'firstName' },
      last_name: { type: String, default: 'lastName' },
      groups: String,
    },
  },

  oidc: {
    issuer: String,
    client_id: String,
    client_secret: String,
    authorization_url: String,
    token_url: String,
    userinfo_url: String,
    scopes: [{ type: String }],
    attribute_mapping: {
      email: { type: String, default: 'email' },
      first_name: { type: String, default: 'given_name' },
      last_name: { type: String, default: 'family_name' },
      groups: String,
    },
  },

  role_mapping: {
    default_role: { type: Schema.Types.ObjectId, ref: 'Role' },
    mappings: [{
      group_name: String,
      role_id: { type: Schema.Types.ObjectId, ref: 'Role' },
    }],
  },

  settings: {
    auto_provision: { type: Boolean, default: true },
    update_on_login: { type: Boolean, default: true },
    allow_password_login: { type: Boolean, default: true },
    force_sso: { type: Boolean, default: false },
  },

  metadata_url: String,
  sp_entity_id: String,
  sp_acs_url: String,
  sp_slo_url: String,
}, schemaOptions);

ssoConfigSchema.index({ tenant_id: 1 });

export const SSOConfig = mongoose.model('SSOConfig', ssoConfigSchema);

import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as SAMLStrategy } from 'passport-saml';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { SSOProvider, ISSOProvider } from '../../models/SSOProvider.js';

export interface SSOProviderConfig {
  provider_name: string; client_id: string; client_secret: string;
  authorization_url: string; token_url: string; userinfo_url: string;
  callback_url: string; scopes: string[];
  saml_entry_point: string; saml_issuer: string; saml_cert: string;
  enabled: boolean;
}

export async function getSSOProviders(tenantId: string): Promise<ISSOProvider[]> {
  return SSOProvider.find({ tenant_id: tenantId, enabled: true });
}

export function buildGoogleStrategy(
  provider: ISSOProvider,
  verify: (accessToken: string, refreshToken: string, profile: any, done: any) => void,
): GoogleStrategy {
  return new GoogleStrategy({
    clientID: provider.client_id, clientSecret: provider.client_secret,
    callbackURL: provider.callback_url, scope: provider.scopes?.length ? provider.scopes : ['openid','email','profile'],
  }, verify);
}
export function buildOAuthStrategy(
  provider: ISSOProvider,
  verify: (accessToken: string, refreshToken: string, profile: any, done: any) => void,
): OAuth2Strategy {
  const strategy = new OAuth2Strategy({
    authorizationURL: provider.authorization_url, tokenURL: provider.token_url,
    clientID: provider.client_id, clientSecret: provider.client_secret,
    callbackURL: provider.callback_url, scope: provider.scopes?.length ? provider.scopes.join(' ') : 'openid email profile',
  }, verify);
  if (provider.userinfo_url) {
    (strategy as any).userProfile = function (accessToken: string, done: any) {
      (this as any)._oauth2.get(provider.userinfo_url, accessToken, (err: any, body: any) => {
        if (err) return done(err);
        try { done(null, JSON.parse(body as string)); } catch (e) { done(e); }
      });
    };
  }
  return strategy;
}

export function buildSAMLStrategy(
  provider: ISSOProvider,
  verify: (profile: any, done: any) => void,
): any {
  return new SAMLStrategy({
    entryPoint: provider.saml_entry_point, issuer: provider.saml_issuer,
    cert: provider.saml_cert, callbackUrl: provider.callback_url,
  } as any, verify as any);
}

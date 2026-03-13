/**
 * Credenciais OAuth por tenant (cliente).
 * Quando preenchidas, substituem as variáveis de ambiente INTEGRATION_* para esse tenant.
 * Segredos em JSONB: em produção considere criptografia em repouso ou vault.
 */
export interface TenantOAuthProviderConfig {
  clientId?: string;
  clientSecret?: string;
  appId?: string;
  appSecret?: string;
}

export interface TenantOAuthConfig {
  google?: TenantOAuthProviderConfig;
  google_calendar?: TenantOAuthProviderConfig;
  google_analytics?: TenantOAuthProviderConfig;
  google_business_profile?: TenantOAuthProviderConfig;
  google_ads?: TenantOAuthProviderConfig;
  facebook_ads?: TenantOAuthProviderConfig;
  linkedin?: TenantOAuthProviderConfig;
  zoom?: TenantOAuthProviderConfig;
  gmail?: TenantOAuthProviderConfig;
  outlook?: TenantOAuthProviderConfig;
}

export type AuthMode = "api-key" | "bearer" | "oauth";
export type OAuthProviderName = "custom" | "workos" | "auth0";

export interface McpServerConfig {
  authMode: AuthMode;
  bearerToken?: string;
  oauth?: OAuthConfig;
  port: number;
  host: string;
  environment: "staging" | "production";
  afriexApiKey: string;
  webhookPublicKey?: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface OAuthConfig {
  provider: OAuthProviderName;
  issuerUrl?: string;
  jwksUrl?: string;
  audience?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;

  // "custom" provider — self-hosted authorization server
  dbPath?: string;
  encryptionKey?: string;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;

  // "workos" provider scaffold
  workosApiKey?: string;
  workosClientId?: string;

  // "auth0" provider scaffold
  auth0Domain?: string;
  auth0MgmtClientId?: string;
  auth0MgmtClientSecret?: string;
}

export function loadConfigFromEnv(): McpServerConfig {
  const provider = (process.env.OAUTH_PROVIDER as OAuthProviderName) || "custom";
  const audience = process.env.OAUTH_AUDIENCE;

  // The custom provider is its own issuer — if OAUTH_ISSUER_URL isn't set explicitly,
  // it defaults to the audience (which should be the server's own public URL).
  const issuerUrl =
    process.env.OAUTH_ISSUER_URL || (provider === "custom" ? audience : undefined);

  return {
    authMode: (process.env.AFRIEX_MCP_AUTH_MODE as AuthMode) || "api-key",
    bearerToken: process.env.AFRIEX_MCP_BEARER_TOKEN,
    oauth: {
      provider,
      issuerUrl,
      jwksUrl: process.env.OAUTH_JWKS_URL,
      audience,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      authorizationEndpoint: process.env.OAUTH_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT,
      dbPath: process.env.OAUTH_DB_PATH || "./afriex-mcp-oauth.db",
      encryptionKey: process.env.OAUTH_ENCRYPTION_KEY,
      accessTokenTtlSeconds: Number(process.env.OAUTH_ACCESS_TOKEN_TTL) || 3600,
      refreshTokenTtlSeconds: Number(process.env.OAUTH_REFRESH_TOKEN_TTL) || 60 * 60 * 24 * 30,
      workosApiKey: process.env.OAUTH_WORKOS_API_KEY,
      workosClientId: process.env.OAUTH_WORKOS_CLIENT_ID,
      auth0Domain: process.env.OAUTH_AUTH0_DOMAIN,
      auth0MgmtClientId: process.env.OAUTH_AUTH0_MGMT_CLIENT_ID,
      auth0MgmtClientSecret: process.env.OAUTH_AUTH0_MGMT_CLIENT_SECRET,
    },
    port: Number(process.env.PORT) || 3001,
    host: process.env.HOST || "0.0.0.0",
    environment: (process.env.AFRIEX_ENVIRONMENT as "staging" | "production") || "staging",
    afriexApiKey: process.env.AFRIEX_API_KEY || "",
    webhookPublicKey: process.env.AFRIEX_WEBHOOK_PUBLIC_KEY,
    logLevel: (process.env.AFRIEX_LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
  };
}

/**
 * stdio mode has no per-request channel — the server-wide key is the only way
 * it can ever get credentials, so it's required there. HTTP mode always has an
 * alternative (an x-afriex-api-key header, or an OAuth-bound key), so
 * AFRIEX_API_KEY is optional there; a request with no credentials at all fails
 * cleanly at that request instead of at startup.
 */
export function validateConfig(config: McpServerConfig, useHttp: boolean): void {
  if (!config.afriexApiKey && !useHttp) {
    throw new Error(
      "AFRIEX_API_KEY environment variable is required in stdio mode. " +
      "Get your API key from https://business.afriex.com. " +
      "(In --http mode this is optional — clients can send their own key via " +
      "the x-afriex-api-key header, or authenticate via OAuth instead.)"
    );
  }
}

export function validateHttpConfig(config: McpServerConfig): void {
  if (config.authMode === "bearer" && !config.bearerToken) {
    throw new Error(
      "AFRIEX_MCP_BEARER_TOKEN is required when auth mode is 'bearer'."
    );
  }

  if (config.authMode === "oauth") {
    const oauth = config.oauth;
    if (!oauth?.audience) {
      throw new Error(
        "OAUTH_AUDIENCE is required when auth mode is 'oauth'. Set it to this server's " +
        "public URL (e.g. https://afriex-mcp.veek.me) for the custom provider, or your " +
        "provider's API identifier for workos/auth0."
      );
    }

    const provider = oauth.provider ?? "custom";
    if (provider === "custom") {
      if (!oauth.encryptionKey) {
        throw new Error(
          "OAUTH_ENCRYPTION_KEY is required when OAUTH_PROVIDER=custom (the default). " +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
      }
    } else if (!oauth.issuerUrl && !oauth.jwksUrl) {
      throw new Error(
        `OAUTH_ISSUER_URL or OAUTH_JWKS_URL is required when OAUTH_PROVIDER=${provider}.`
      );
    }
  }
}

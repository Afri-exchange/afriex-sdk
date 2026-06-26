export type AuthMode = "api-key" | "bearer" | "oauth";

export interface McpServerConfig {
  authMode: AuthMode;
  apiKey?: string;
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
  issuerUrl?: string;
  jwksUrl?: string;
  audience?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
}

export function loadConfigFromEnv(): McpServerConfig {
  return {
    authMode: (process.env.AFRIEX_MCP_AUTH_MODE as AuthMode) || "api-key",
    apiKey: process.env.AFRIEX_MCP_API_KEY,
    bearerToken: process.env.AFRIEX_MCP_BEARER_TOKEN,
    oauth: {
      issuerUrl: process.env.OAUTH_ISSUER_URL,
      jwksUrl: process.env.OAUTH_JWKS_URL,
      audience: process.env.OAUTH_AUDIENCE,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      authorizationEndpoint: process.env.OAUTH_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT,
    },
    port: Number(process.env.PORT) || 3001,
    host: process.env.HOST || "0.0.0.0",
    environment: (process.env.AFRIEX_ENVIRONMENT as "staging" | "production") || "production",
    afriexApiKey: process.env.AFRIEX_API_KEY || "",
    webhookPublicKey: process.env.AFRIEX_WEBHOOK_PUBLIC_KEY,
    logLevel: (process.env.AFRIEX_LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
  };
}

export function validateConfig(config: McpServerConfig): void {
  if (!config.afriexApiKey) {
    throw new Error(
      "AFRIEX_API_KEY environment variable is required. " +
      "Get your API key from https://business.afriex.com"
    );
  }
  if (config.authMode === "api-key" && !config.apiKey) {
    throw new Error(
      "AFRIEX_MCP_API_KEY is required when auth mode is 'api-key'. " +
      "Set it to a secret value that MCP clients will use to authenticate."
    );
  }
  if (config.authMode === "bearer" && !config.bearerToken) {
    throw new Error(
      "AFRIEX_MCP_BEARER_TOKEN is required when auth mode is 'bearer'."
    );
  }
}

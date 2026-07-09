import type { OAuthProvider, AuthorizationServerMetadata } from "../types.js";

/**
 * Auth0-backed provider. Unlike the custom provider, this one hosts nothing
 * itself — /authorize, /token, /register, and the JWKS all live on Auth0's
 * tenant, and MCP clients talk to Auth0 directly using the metadata below.
 * mountRoutes() is a no-op for exactly that reason.
 *
 * This is a real integration, not just a stub: Auth0 supports OIDC Dynamic
 * Client Registration (RFC 7591-compatible) at /oidc/register with no setup
 * required, so DCR "just works" once OAUTH_AUTH0_DOMAIN is set — no
 * OAUTH_AUTH0_MGMT_CLIENT_ID/SECRET needed for that part.
 *
 * The one piece that can't be wired from this codebase: this server's
 * resource-server side (see ../../auth/index.ts) expects the validated JWT
 * to carry an `afx_key` claim — the Afriex API key for that grant, encrypted
 * with OAUTH_ENCRYPTION_KEY via oauth/crypto.ts's encryptSecret() — plus a
 * plaintext `afx_env` claim ("staging" | "production"). Auth0 doesn't know
 * about Afriex API keys, so you must add an Auth0 Action (Login flow) that:
 *   1. Looks up the authenticated user/client's Afriex API key (wherever you
 *      store it — Auth0 app_metadata, or your own DB keyed by the Auth0 user).
 *   2. Encrypts it with the *same* OAUTH_ENCRYPTION_KEY value, AES-256-GCM,
 *      matching oauth/crypto.ts's encryptSecret() output format exactly.
 *   3. Sets it as a custom claim named `afx_key` (and `afx_env`) on the
 *      issued token via `api.accessToken.setCustomClaim(...)`.
 * Without that Action, tokens still validate (signature/exp/aud/iss), but
 * tool calls fall back to this server's own static AFRIEX_API_KEY, if any —
 * fine for a single-tenant OAuth-gated deployment, not for multi-tenant.
 */
export function createAuth0Provider(): OAuthProvider {
  return {
    name: "auth0",
    getAuthorizationServerMetadata(_baseUrl: string): AuthorizationServerMetadata {
      const domain = process.env.OAUTH_AUTH0_DOMAIN;
      if (!domain) {
        throw new Error("OAUTH_AUTH0_DOMAIN is required when OAUTH_PROVIDER=auth0.");
      }
      const issuer = `https://${domain}/`;
      return {
        issuer,
        authorization_endpoint: `https://${domain}/authorize`,
        token_endpoint: `https://${domain}/oauth/token`,
        registration_endpoint: `https://${domain}/oidc/register`,
        jwks_uri: `https://${domain}/.well-known/jwks.json`,
        token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["openid", "profile", "offline_access"],
      };
    },
    mountRoutes() {
      // Nothing to mount — Auth0 hosts every endpoint itself.
    },
  };
}

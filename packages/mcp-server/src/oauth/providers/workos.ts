import type { OAuthProvider, AuthorizationServerMetadata } from "../types.js";

/**
 * WorkOS scaffold. Genuinely incomplete — unlike Auth0, WorkOS's AuthKit /
 * User Management product isn't built around arbitrary third-party clients
 * doing OAuth 2.1 + Dynamic Client Registration (RFC 7591) against your API;
 * it's built around adding login to *your own* app via their SDK. Making it
 * behave like a generic MCP-facing authorization server needs a real design
 * decision (e.g. proxy DCR through the WorkOS Organizations/Connections API,
 * or drop DCR and hand out manually-provisioned client_ids) that only makes
 * sense once you're actually looking at a WorkOS tenant.
 *
 * What's wired up: the OAuthProvider interface, env var plumbing
 * (OAUTH_WORKOS_API_KEY, OAUTH_WORKOS_CLIENT_ID), and the provider factory
 * switch — so turning this into a real integration is a matter of filling in
 * the two methods below, not restructuring the auth system.
 *
 * Once implemented, the same `afx_key` / `afx_env` encrypted-claim contract
 * documented in ./auth0.ts applies here too: whatever mechanism WorkOS
 * offers for custom token claims needs to inject those, encrypted with
 * OAUTH_ENCRYPTION_KEY via oauth/crypto.ts's encryptSecret(), for
 * auth/index.ts to resolve a per-tenant Afriex API key from the token.
 */
export function createWorkosProvider(): OAuthProvider {
  return {
    name: "workos",
    getAuthorizationServerMetadata(_baseUrl: string): AuthorizationServerMetadata {
      const clientId = process.env.OAUTH_WORKOS_CLIENT_ID;
      if (!clientId) {
        throw new Error(
          "OAUTH_WORKOS_CLIENT_ID is required when OAUTH_PROVIDER=workos. " +
          "Note: this provider is a scaffold — see oauth/providers/workos.ts for what's left to implement.",
        );
      }
      // WorkOS's User Management authorize/token endpoints, parameterized by client ID.
      // Not verified end-to-end against a live tenant — confirm against current WorkOS docs before relying on this.
      return {
        issuer: "https://api.workos.com/",
        authorization_endpoint: "https://api.workos.com/user_management/authorize",
        token_endpoint: "https://api.workos.com/user_management/authenticate",
        jwks_uri: `https://api.workos.com/sso/jwks/${clientId}`,
        token_endpoint_auth_methods_supported: ["client_secret_post"],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["openid", "profile", "email"],
      };
    },
    mountRoutes(app) {
      // Dynamic Client Registration isn't available the way it is for Auth0.
      // Fail loudly rather than silently accepting registrations that go nowhere.
      app.post("/register", (_req, res) => {
        res.status(501).json({
          error: "not_implemented",
          message:
            "Dynamic client registration is not implemented for the WorkOS provider. " +
            "Provision clients through your WorkOS dashboard/API and configure them manually, " +
            "or implement this in oauth/providers/workos.ts.",
        });
      });
    },
  };
}

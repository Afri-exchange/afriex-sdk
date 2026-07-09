import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServerConfig, OAuthConfig } from "../config.js";
import { decryptSecret, loadEncryptionKey } from "../oauth/crypto.js";

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  statusCode?: number;
}

export type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

type AuthenticatedRequest = Request & { auth?: AuthInfo };

export function createAuthMiddleware(config: McpServerConfig): AuthMiddleware {
  switch (config.authMode) {
    case "api-key":
      return createApiKeyMiddleware(config.afriexApiKey);
    case "bearer":
      return createBearerMiddleware(config.bearerToken!);
    case "oauth":
      return createOAuthMiddleware(config);
    default:
      return (_req, _res, next) => next();
  }
}

/**
 * A caller supplying their own x-afriex-api-key is inherently self-authorizing
 * — the worst a bad key does is fail against the caller's own Afriex account,
 * so no separate gate is needed. x-api-key only matters as a fallback: it
 * protects the server's own static AFRIEX_API_KEY from being used by callers
 * who didn't bring their own key.
 */
function createApiKeyMiddleware(apiKey: string): AuthMiddleware {
  return (req, res, next) => {
    if (req.headers["x-afriex-api-key"]) {
      next();
      return;
    }

    const provided = req.headers["x-api-key"] as string | undefined;
    if (!apiKey || !provided || provided !== apiKey) {
      res.status(401).json({
        error: "Unauthorized",
        message:
          "Send your own key via x-afriex-api-key, or a valid x-api-key header " +
          "matching this server's configured AFRIEX_API_KEY.",
      });
      return;
    }
    next();
  };
}

function createBearerMiddleware(token: string): AuthMiddleware {
  return (req, res, next) => {
    const header = req.headers.authorization as string | undefined;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authorization: Bearer <token> header is required",
      });
      return;
    }
    const provided = header.slice(7);
    if (provided !== token) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid bearer token",
      });
      return;
    }
    next();
  };
}

type RemoteJWKSet = ReturnType<typeof createRemoteJWKSet>;

function createOAuthMiddleware(config: McpServerConfig): AuthMiddleware {
  const { oauth } = config;
  if (!oauth?.issuerUrl && !oauth?.jwksUrl) {
    throw new Error(
      "OAuth mode requires either OAUTH_ISSUER_URL or OAUTH_JWKS_URL to be configured",
    );
  }

  // Explicit JWKS URL (or one derivable from the issuer) means we can verify
  // JWT signatures locally. Built once so the key set is cached across requests
  // instead of being re-fetched on every call.
  let jwksUrl = oauth.jwksUrl;
  if (!jwksUrl && oauth.issuerUrl) {
    jwksUrl = `${oauth.issuerUrl.replace(/\/$/, "")}/.well-known/jwks.json`;
  }
  const jwks: RemoteJWKSet | undefined = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : undefined;
  const encryptionKey = oauth.encryptionKey ? loadEncryptionKey(oauth.encryptionKey) : undefined;

  return async (req, res, next) => {
    const header = req.headers.authorization as string | undefined;

    if (!header || !header.startsWith("Bearer ")) {
      res.status(401);
      res.setHeader(
        "WWW-Authenticate",
        `Bearer realm="afriex-mcp", resource_metadata="${getBaseUrl(req)}/.well-known/oauth-protected-resource"`,
      );
      res.json({
        error: "unauthorized",
        message: "Authorization: Bearer <token> header is required",
      });
      return;
    }

    const token = header.slice(7);

    try {
      const authInfo = await validateOAuthToken(token, oauth, jwks, encryptionKey);
      if (!authInfo) {
        res.status(401).json({
          error: "invalid_token",
          message: "The access token is invalid or expired",
        });
        return;
      }
      // Populates extra.authInfo in tool callbacks (see shared/protocol.d.ts /
      // server/streamableHttp.js — the transport reads req.auth verbatim).
      // Without this, OAuth mode authenticated the transport but tool
      // handlers had no way to know which client/grant made the call.
      (req as AuthenticatedRequest).auth = authInfo;
      next();
    } catch {
      res.status(500).json({
        error: "server_error",
        message: "Failed to validate access token",
      });
    }
  };
}

async function validateOAuthToken(
  token: string,
  oauth: OAuthConfig,
  jwks: RemoteJWKSet | undefined,
  encryptionKey: Buffer | undefined,
): Promise<AuthInfo | undefined> {
  try {
    if (jwks) {
      return await validateJwtWithJwks(token, jwks, oauth, encryptionKey);
    }
    if (oauth.issuerUrl) {
      const valid = await validateTokenWithUserinfo(token, oauth.issuerUrl);
      return valid ? { token, clientId: "unknown", scopes: [] } : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function validateJwtWithJwks(
  token: string,
  jwks: RemoteJWKSet,
  oauth: OAuthConfig,
  encryptionKey: Buffer | undefined,
): Promise<AuthInfo | undefined> {
  try {
    const options: JWTVerifyOptions = {};
    if (oauth.audience) options.audience = oauth.audience;
    if (oauth.issuerUrl) options.issuer = oauth.issuerUrl;

    // jwtVerify cryptographically verifies the signature against the key
    // matching the token's `kid` and checks `exp`/`nbf`, `aud`, and `iss`.
    // A forged token — even one with a valid-looking header/payload — fails here.
    const { payload } = await jwtVerify(token, jwks, options);

    const scope = typeof payload.scope === "string" ? payload.scope : "";
    const clientId =
      typeof payload.client_id === "string"
        ? payload.client_id
        : typeof payload.sub === "string"
          ? payload.sub
          : "unknown";

    const authInfo: AuthInfo = {
      token,
      clientId,
      scopes: scope.split(" ").filter(Boolean),
      expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
    };

    // Per-tenant Afriex credentials, if this token carries them. The custom
    // provider always sets afx_key (AES-256-GCM ciphertext, never the raw
    // key — see oauth/providers/custom.ts). External providers (Auth0/WorkOS)
    // only carry it if configured to inject the same encrypted claim; see
    // oauth/providers/auth0.ts for that contract. If absent, the token is
    // still valid — tool calls just fall back to this server's static key.
    const encryptedApiKey = payload.afx_key;
    if (typeof encryptedApiKey === "string" && encryptionKey) {
      try {
        const afriexApiKey = decryptSecret(encryptedApiKey, encryptionKey);
        authInfo.extra = {
          afriexApiKey,
          afriexEnvironment: typeof payload.afx_env === "string" ? payload.afx_env : undefined,
        };
      } catch {
        // Ciphertext didn't decrypt under our key (e.g. a foreign token) — ignore, token stays valid.
      }
    }

    return authInfo;
  } catch {
    return undefined;
  }
}

async function validateTokenWithUserinfo(token: string, issuerUrl: string): Promise<boolean> {
  try {
    const baseUrl = issuerUrl.replace(/\/$/, "");
    const userinfoUrl = `${baseUrl}/oauth/userinfo`;
    const response = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

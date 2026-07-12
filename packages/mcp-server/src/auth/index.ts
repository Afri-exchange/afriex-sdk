import type { Request, Response, NextFunction } from "express";
import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServerConfig, OAuthConfig } from "../config.js";
import { decryptSecret, loadEncryptionKey } from "../oauth/crypto.js";
import { getDb } from "../oauth/db.js";
import { loadOrCreateSigningKey } from "../oauth/keys.js";
import { toResourceUrl } from "../oauth/types.js";
import { getLogger, reqLogger } from "../logger.js";

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

type JwksGetter = ReturnType<typeof createLocalJWKSet>;

function createOAuthMiddleware(config: McpServerConfig): AuthMiddleware {
  const { oauth } = config;
  if (!oauth?.issuerUrl && !oauth?.jwksUrl) {
    throw new Error(
      "OAuth mode requires either OAUTH_ISSUER_URL or OAUTH_JWKS_URL to be configured",
    );
  }

  const isCustomProvider = (oauth.provider ?? "custom") === "custom";
  const authLogger = getLogger().child({ module: "oauth-auth" });

  const jwksPromise: Promise<JwksGetter> = isCustomProvider
    ? // Same process issues and validates tokens for the custom provider —
      // resolve the signing key directly instead of round-tripping over
      // HTTP to our own /.well-known/jwks.json. That self-referential fetch
      // depends on the server being able to reach its own public URL from
      // inside its own container, which reverse proxies (Traefik, etc.)
      // often don't support ("hairpin" routing) — it fails or hangs, and
      // every OAuth-authenticated request 401s even though the token we
      // ourselves issued is perfectly valid.
      loadOrCreateSigningKey(getDb(oauth.dbPath || "./afriex-mcp-oauth.db")).then((key) =>
        createLocalJWKSet({ keys: [key.publicJwk] }),
      )
    : Promise.resolve(resolveRemoteJwks(oauth));

  // Resolve eagerly (rather than only on first request) so a broken JWKS
  // source — bad OAUTH_JWKS_URL, unwritable OAUTH_DB_PATH, etc. — shows up
  // in startup logs immediately instead of surfacing later as every
  // authenticated request 500ing with no obvious cause.
  jwksPromise
    .then(() => authLogger.info({ provider: isCustomProvider ? "custom" : "remote" }, "JWKS resolved"))
    .catch((err) => authLogger.error({ err }, "Failed to resolve JWKS — all OAuth requests will fail until this is fixed"));

  const encryptionKey = oauth.encryptionKey ? loadEncryptionKey(oauth.encryptionKey) : undefined;

  // The custom provider signs tokens with `aud` = the /mcp resource URL (see
  // oauth/providers/custom.ts) to satisfy RFC 9728's requirement that it match
  // the Protected Resource Metadata `resource` field exactly. External
  // providers (Auth0/WorkOS) issue whatever `aud` the operator configured on
  // their side, unrelated to our own URL — leave that one exactly as set.
  const expectedAudience = oauth.audience
    ? isCustomProvider
      ? toResourceUrl(oauth.audience)
      : oauth.audience
    : undefined;

  return async (req, res, next) => {
    const log = reqLogger(req);
    const header = req.headers.authorization as string | undefined;

    if (!header || !header.startsWith("Bearer ")) {
      log.warn({ path: req.path }, "OAuth request rejected: missing Bearer token");
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
      const jwks = await jwksPromise;
      const { authInfo, reason } = await validateJwtWithJwks(token, jwks, oauth, expectedAudience, encryptionKey);
      if (!authInfo) {
        log.warn({ reason, expectedAudience, issuer: oauth.issuerUrl }, "OAuth request rejected: invalid token");
        res.status(401).json({
          error: "invalid_token",
          message: "The access token is invalid or expired",
        });
        return;
      }
      log.debug({ clientId: authInfo.clientId, scopes: authInfo.scopes }, "OAuth token validated");
      // Populates extra.authInfo in tool callbacks (see shared/protocol.d.ts /
      // server/streamableHttp.js — the transport reads req.auth verbatim).
      // Without this, OAuth mode authenticated the transport but tool
      // handlers had no way to know which client/grant made the call.
      (req as AuthenticatedRequest).auth = authInfo;
      next();
    } catch (err) {
      log.error({ err }, "OAuth request failed: error validating access token (JWKS unavailable?)");
      res.status(500).json({
        error: "server_error",
        message: "Failed to validate access token",
      });
    }
  };
}

function resolveRemoteJwks(oauth: OAuthConfig): ReturnType<typeof createRemoteJWKSet> {
  let jwksUrl = oauth.jwksUrl;
  if (!jwksUrl && oauth.issuerUrl) {
    jwksUrl = `${oauth.issuerUrl.replace(/\/$/, "")}/.well-known/jwks.json`;
  }
  // Guaranteed non-empty by the check in createOAuthMiddleware before this runs.
  return createRemoteJWKSet(new URL(jwksUrl!));
}

interface JwtValidationResult {
  authInfo?: AuthInfo;
  /** jose's error name (e.g. "JWTExpired", "JWTClaimValidationFailed" for an aud/iss mismatch) — only set on failure, logged by the caller to distinguish "token expired" from "wrong audience" from "bad signature" instead of one opaque 401. */
  reason?: string;
}

async function validateJwtWithJwks(
  token: string,
  jwks: JwksGetter,
  oauth: OAuthConfig,
  expectedAudience: string | undefined,
  encryptionKey: Buffer | undefined,
): Promise<JwtValidationResult> {
  try {
    const options: JWTVerifyOptions = {};
    if (expectedAudience) options.audience = expectedAudience;
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

    return { authInfo };
  } catch (err) {
    return { reason: err instanceof Error ? err.name : String(err) };
  }
}

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

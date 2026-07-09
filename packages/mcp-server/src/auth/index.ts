import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from "jose";
import type { McpServerConfig, OAuthConfig } from "../config.js";

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

function createApiKeyMiddleware(apiKey: string): AuthMiddleware {
  return (req, res, next) => {
    const provided = req.headers["x-api-key"] as string | undefined;
    if (!provided || provided !== apiKey) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Valid x-api-key header is required",
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
      const isValid = await validateOAuthToken(token, oauth, jwks);
      if (!isValid) {
        res.status(401).json({
          error: "invalid_token",
          message: "The access token is invalid or expired",
        });
        return;
      }
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
): Promise<boolean> {
  try {
    if (jwks) {
      return await validateJwtWithJwks(token, jwks, oauth);
    }
    if (oauth.issuerUrl) {
      return await validateTokenWithUserinfo(token, oauth.issuerUrl);
    }
    return false;
  } catch {
    return false;
  }
}

async function validateJwtWithJwks(
  token: string,
  jwks: RemoteJWKSet,
  oauth: OAuthConfig,
): Promise<boolean> {
  try {
    const options: JWTVerifyOptions = {};
    if (oauth.audience) options.audience = oauth.audience;
    if (oauth.issuerUrl) options.issuer = oauth.issuerUrl;

    // jwtVerify cryptographically verifies the signature against the key
    // matching the token's `kid` and checks `exp`/`nbf`, `aud`, and `iss`.
    // A forged token — even one with a valid-looking header/payload — fails here.
    await jwtVerify(token, jwks, options);
    return true;
  } catch {
    return false;
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

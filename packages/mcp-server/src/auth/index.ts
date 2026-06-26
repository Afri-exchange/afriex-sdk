import type { Request, Response, NextFunction } from "express";
import type { McpServerConfig } from "../config.js";

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
      return createApiKeyMiddleware(config.apiKey!);
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

function createOAuthMiddleware(config: McpServerConfig): AuthMiddleware {
  const { oauth } = config;
  if (!oauth?.issuerUrl && !oauth?.jwksUrl) {
    throw new Error(
      "OAuth mode requires either OAUTH_ISSUER_URL or OAUTH_JWKS_URL to be configured",
    );
  }

  let jwksUrl = oauth.jwksUrl;
  if (!jwksUrl && oauth.issuerUrl) {
    jwksUrl = `${oauth.issuerUrl.replace(/\/$/, "")}/.well-known/jwks.json`;
  }

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
      const isValid = await validateOAuthToken(token, config);
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

async function validateOAuthToken(token: string, config: McpServerConfig): Promise<boolean> {
  const { oauth } = config;
  if (!oauth) return false;

  try {
    if (oauth.jwksUrl) {
      return await validateJwtWithJwks(token, oauth.jwksUrl, oauth.audience);
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
  jwksUrl: string,
  audience?: string,
): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const header = JSON.parse(atob(parts[0])) as Record<string, unknown>;
    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;

    if (payload.exp && Number(payload.exp) * 1000 < Date.now()) return false;
    if (audience && payload.aud !== audience) return false;

    const response = await fetch(jwksUrl);
    const { keys } = await response.json() as { keys: Record<string, unknown>[] };

    const kid = String(header.kid ?? "");
    const key = keys.find((k) => k.kid === kid);
    if (!key) return false;

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

import type { Express } from "express";
import type { McpServerConfig } from "../config.js";

export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  registration_endpoint?: string;
  jwks_uri?: string;
  token_endpoint_auth_methods_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  scopes_supported?: string[];
}

/**
 * Normalizes a configured base URL into the canonical MCP resource URL
 * (RFC 9728 requires the Protected Resource Metadata `resource` field to
 * exactly equal the URL the client connects to — for this server, always
 * the /mcp endpoint, not just the origin). Idempotent so it's safe whether
 * the operator's OAUTH_AUDIENCE already includes /mcp or not.
 */
export function toResourceUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/mcp") ? trimmed : `${trimmed}/mcp`;
}

/**
 * One authorization-server backend behind the `--oauth` flag. `custom` hosts
 * every endpoint itself; `workos`/`auth0` describe an externally-hosted
 * issuer instead. Swapping OAUTH_PROVIDER is meant to be the only change
 * needed to move between them.
 */
export interface OAuthProvider {
  readonly name: string;
  /** RFC 8414 Authorization Server Metadata, given this MCP server's own public base URL. */
  getAuthorizationServerMetadata(baseUrl: string): AuthorizationServerMetadata;
  /** Mount any endpoints this provider hosts itself (e.g. /authorize, /token, /register, JWKS). No-op if everything lives on an external issuer. */
  mountRoutes(app: Express, config: McpServerConfig): void;
}

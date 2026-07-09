#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "./create-server.js";
import { loadConfigFromEnv, validateConfig } from "./config.js";
import type { McpServerConfig } from "./config.js";
import { startHttpServer } from "./transport/http.js";

function printUsage(): void {
  console.log(`
Afriex MCP Server — AI-native cross-border payment operations

USAGE
  npx @afriex/mcp-server [options]

OPTIONS
  --http, -h           Start in HTTP mode (default: stdio)
  --oauth, -o          Enable OAuth 2.1 authentication mode
  --port=<number>      HTTP server port (default: 3001, env: PORT)
  --help               Show this help

ENVIRONMENT VARIABLES
  AFRIEX_API_KEY                  Your Afriex API key. Required unless
                                   AFRIEX_MCP_ALLOW_CLIENT_CREDENTIALS=true.
                                   In HTTP api-key mode, MCP clients also
                                   authenticate with this same key via the
                                   x-api-key header.
  AFRIEX_ENVIRONMENT              "staging" or "production" (default: production)
  AFRIEX_MCP_AUTH_MODE            "api-key" | "bearer" | "oauth" (default: api-key)
  AFRIEX_MCP_BEARER_TOKEN         Bearer token for MCP clients (bearer mode)
  AFRIEX_MCP_ALLOW_CLIENT_CREDENTIALS
                                   "true" to let each HTTP request supply its own
                                   x-afriex-api-key (+ optional x-afriex-environment)
                                   header, overriding the server-wide key. For
                                   multi-tenant deployments where each caller
                                   brings their own Afriex API key.
  AFRIEX_WEBHOOK_PUBLIC_KEY        Public key for webhook signature verification
  AFRIEX_LOG_LEVEL                 "debug" | "info" | "warn" | "error"
  PORT                             HTTP server port
  HOST                             HTTP server host (default: 0.0.0.0)

OAUTH (oauth mode)
  OAUTH_PROVIDER            "custom" | "workos" | "auth0" (default: custom)
  OAUTH_AUDIENCE             (required) This server's public URL for the
                              custom provider, or your provider's API identifier
  OAUTH_ISSUER_URL           OAuth issuer URL (defaults to OAUTH_AUDIENCE for
                              the custom provider; required for workos/auth0
                              unless OAUTH_JWKS_URL is set)
  OAUTH_JWKS_URL              JWKS URL for token validation

  --- custom provider (self-hosted authorization server) ---
  OAUTH_ENCRYPTION_KEY        (required) 32-byte hex key encrypting Afriex API
                               keys at rest. Generate with:
                               node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  OAUTH_DB_PATH                SQLite file path (default: ./afriex-mcp-oauth.db)
  OAUTH_ACCESS_TOKEN_TTL       Access token lifetime in seconds (default: 3600)
  OAUTH_REFRESH_TOKEN_TTL      Refresh token lifetime in seconds (default: 30 days)

  --- workos / auth0 providers (external authorization server) ---
  OAUTH_AUTH0_DOMAIN           Auth0 tenant domain, e.g. your-tenant.us.auth0.com
  OAUTH_WORKOS_CLIENT_ID       WorkOS client ID (scaffold — see oauth/providers/workos.ts)
  OAUTH_WORKOS_API_KEY         WorkOS API key (scaffold)
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const useHttp = args.includes("--http") || args.includes("-h");
  const useOAuth = args.includes("--oauth") || args.includes("-o");
  const portArg = args.find((a) => a.startsWith("--port=") || a.startsWith("-p="));
  const port = portArg ? parseInt(portArg.split("=")[1], 10) : undefined;

  let config: McpServerConfig;

  try {
    config = loadConfigFromEnv();
    if (useOAuth) config.authMode = "oauth";
    if (port) config.port = port;
    validateConfig(config);
  } catch (error) {
    console.error(`Configuration error: ${error}`);
    console.error("Run with --help to see usage.");
    process.exit(1);
  }

  const server: McpServer = createMcpServer(config);

  if (useHttp) {
    await startHttpServer(server, config);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

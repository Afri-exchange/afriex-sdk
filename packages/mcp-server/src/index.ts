#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./create-server.js";
import { loadConfigFromEnv, validateConfig } from "./config.js";
import type { McpServerConfig } from "./config.js";
import { startHttpServer } from "./transport/http.js";
import { initLogger, getLogger } from "./logger.js";

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
  AFRIEX_API_KEY             Your Afriex API key. Required in stdio mode.
                              Optional in --http mode: if set, it's used as
                              the fallback key for callers that don't send
                              their own x-afriex-api-key header (and, in
                              api-key auth mode, x-api-key gates access to it).
  AFRIEX_ENVIRONMENT         "staging" or "production" (default: staging)
  AFRIEX_MCP_AUTH_MODE       "api-key" | "bearer" | "oauth" (default: api-key)
  AFRIEX_MCP_BEARER_TOKEN    Bearer token for MCP clients (bearer mode)
  AFRIEX_WEBHOOK_PUBLIC_KEY  Public key for webhook signature verification
  AFRIEX_LOG_LEVEL           "debug" | "info" | "warn" | "error"
  PORT                       HTTP server port
  HOST                       HTTP server host (default: 0.0.0.0)

MULTI-TENANT / BRING-YOUR-OWN-KEY (any --http mode)
  Any request may send its own credentials directly, no server config needed:
    x-afriex-api-key: <caller's Afriex API key>   (used as-is; a bad key just
                                                     fails naturally at the
                                                     Afriex API)
    x-afriex-environment: staging | production      (optional, default: staging)
  In api-key auth mode specifically, sending x-afriex-api-key also satisfies
  the gate (no separate x-api-key needed) — you're using your own key, so
  there's nothing to protect. x-api-key is only checked as a fallback when a
  caller relies on the server's own AFRIEX_API_KEY instead.

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
    validateConfig(config, useHttp);
  } catch (error) {
    console.error(`Configuration error: ${error}`);
    console.error("Run with --help to see usage.");
    process.exit(1);
  }

  const logger = initLogger(config.logLevel);
  logger.info(
    {
      transport: useHttp ? "http" : "stdio",
      authMode: config.authMode,
      environment: config.environment,
      port: useHttp ? config.port : undefined,
    },
    "Starting Afriex MCP server",
  );

  if (useHttp) {
    // The Streamable HTTP transport in stateless mode (sessionIdGenerator:
    // undefined — the only mode this server uses) refuses to be reused
    // across requests: its handleRequest() throws on the second call. HTTP
    // mode therefore builds a fresh McpServer + transport per request (see
    // transport/http.ts) rather than one shared instance connected at
    // startup, unlike the single long-lived connection stdio mode uses below.
    await startHttpServer(config);
  } else {
    const server = createMcpServer(config);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("Afriex MCP server connected over stdio");
  }
}

main().catch((error) => {
  // main() can throw before initLogger() ever runs (e.g. a config error);
  // getLogger() falls back to a default-level logger in that case.
  getLogger().fatal({ err: error }, "Fatal error during startup");
  process.exit(1);
});

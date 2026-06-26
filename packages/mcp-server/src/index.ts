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
  AFRIEX_API_KEY            (required) Your Afriex API key
  AFRIEX_ENVIRONMENT        "staging" or "production" (default: production)
  AFRIEX_MCP_AUTH_MODE      "api-key" | "bearer" | "oauth" (default: api-key)
  AFRIEX_MCP_API_KEY        API key for MCP clients to use (api-key mode)
  AFRIEX_MCP_BEARER_TOKEN   Bearer token for MCP clients (bearer mode)
  AFRIEX_WEBHOOK_PUBLIC_KEY Public key for webhook signature verification
  AFRIEX_LOG_LEVEL          "debug" | "info" | "warn" | "error"
  PORT                      HTTP server port
  HOST                      HTTP server host (default: 0.0.0.0)
  OAUTH_ISSUER_URL          OAuth issuer URL (oauth mode)
  OAUTH_JWKS_URL            JWKS URL for token validation (oauth mode)
  OAUTH_AUDIENCE            Expected token audience (oauth mode)
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AfriexSDK } from "@afriex/sdk";
import type { McpServerConfig } from "./config.js";
import { registerAllTools } from "./tools/index.js";

export interface ToolRegistry {
  server: McpServer;
  getSdk: () => AfriexSDK;
}

export function createMcpServer(config: McpServerConfig): McpServer {
  const sdk = new AfriexSDK({
    apiKey: config.afriexApiKey,
    environment: config.environment,
    webhookPublicKey: config.webhookPublicKey,
    logLevel: config.logLevel === "debug" ? "debug" : config.logLevel === "info" ? "info" : "error",
    enableLogging: config.logLevel !== "error",
  });

  const server = new McpServer({
    name: "afriex-mcp",
    version: "1.0.0",
  });

  const registry: ToolRegistry = {
    server,
    getSdk: () => sdk,
  };

  registerAllTools(registry);

  return server;
}

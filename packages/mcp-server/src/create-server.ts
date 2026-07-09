import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { AfriexSDK } from "@afriex/sdk";
import type { McpServerConfig } from "./config.js";
import { registerAllTools } from "./tools/index.js";

export type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

export interface ToolRegistry {
  server: McpServer;
  getSdk: (extra?: ToolExtra) => AfriexSDK;
}

const SDK_CACHE_LIMIT = 500;

function buildSdk(config: McpServerConfig, apiKey: string, environment: "staging" | "production"): AfriexSDK {
  return new AfriexSDK({
    apiKey,
    environment,
    webhookPublicKey: config.webhookPublicKey,
    logLevel: config.logLevel === "debug" ? "debug" : config.logLevel === "info" ? "info" : "error",
    enableLogging: config.logLevel !== "error",
  });
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolves the Afriex API key and environment for a single tool call. Each
 * is resolved independently, in the same priority order: a validated OAuth
 * grant, then a client-supplied header, then the server's static config.
 * This lets a caller override just the environment (e.g. force staging)
 * while still relying on the server's shared key, or vice versa.
 */
function resolveCredentials(
  config: McpServerConfig,
  extra?: ToolExtra,
): { apiKey: string; environment: "staging" | "production" } | undefined {
  const authExtra = extra?.authInfo?.extra as Record<string, unknown> | undefined;
  const headers = extra?.requestInfo?.headers;

  const apiKey =
    (authExtra?.afriexApiKey ? String(authExtra.afriexApiKey) : undefined) ||
    firstHeaderValue(headers?.["x-afriex-api-key"]) ||
    config.afriexApiKey ||
    undefined;

  if (!apiKey) return undefined;

  const environment =
    (authExtra?.afriexEnvironment as "staging" | "production" | undefined) ||
    (firstHeaderValue(headers?.["x-afriex-environment"]) as "staging" | "production" | undefined) ||
    config.environment;

  return { apiKey, environment };
}

export function createMcpServer(config: McpServerConfig): McpServer {
  const server = new McpServer({
    name: "afriex",
    version: "1.0.0",
  });

  const sdkCache = new Map<string, AfriexSDK>();

  const getSdk = (extra?: ToolExtra): AfriexSDK => {
    const creds = resolveCredentials(config, extra);
    if (!creds) {
      throw new Error(
        "No Afriex API key available for this request. Configure AFRIEX_API_KEY on the server, " +
        "or have the client authenticate via OAuth / send an x-afriex-api-key header.",
      );
    }

    const cacheKey = `${creds.environment}:${creds.apiKey}`;
    let sdk = sdkCache.get(cacheKey);
    if (!sdk) {
      if (sdkCache.size >= SDK_CACHE_LIMIT) {
        const oldestKey = sdkCache.keys().next().value;
        if (oldestKey) sdkCache.delete(oldestKey);
      }
      sdk = buildSdk(config, creds.apiKey, creds.environment);
      sdkCache.set(cacheKey, sdk);
    }
    return sdk;
  };

  const registry: ToolRegistry = { server, getSdk };

  registerAllTools(registry);

  return server;
}

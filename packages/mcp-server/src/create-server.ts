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
 * Resolves the Afriex credentials for a single tool call. Per-request
 * credentials — a validated OAuth grant, or a client-supplied
 * x-afriex-api-key header — take priority over the server-wide static key,
 * so one deployment can serve many tenants each bringing their own key.
 */
function resolveCredentials(
  config: McpServerConfig,
  extra?: ToolExtra,
): { apiKey: string; environment: "staging" | "production" } | undefined {
  const authExtra = extra?.authInfo?.extra as Record<string, unknown> | undefined;
  if (authExtra?.afriexApiKey) {
    return {
      apiKey: String(authExtra.afriexApiKey),
      environment: (authExtra.afriexEnvironment as "staging" | "production") || config.environment,
    };
  }

  const headers = extra?.requestInfo?.headers;
  const headerKey = firstHeaderValue(headers?.["x-afriex-api-key"]);
  if (headerKey) {
    const headerEnv = firstHeaderValue(headers?.["x-afriex-environment"]) as
      | "staging"
      | "production"
      | undefined;
    return { apiKey: headerKey, environment: headerEnv || config.environment };
  }

  return undefined;
}

export function createMcpServer(config: McpServerConfig): McpServer {
  const server = new McpServer({
    name: "afriex-mcp",
    version: "1.0.0",
  });

  let defaultSdk: AfriexSDK | undefined;
  const sdkCache = new Map<string, AfriexSDK>();

  const getSdk = (extra?: ToolExtra): AfriexSDK => {
    const creds = resolveCredentials(config, extra);
    if (!creds) {
      if (!config.afriexApiKey) {
        throw new Error(
          "No Afriex API key available for this request. Configure AFRIEX_API_KEY on the server, " +
          "or have the client authenticate via OAuth / send an x-afriex-api-key header.",
        );
      }
      if (!defaultSdk) {
        defaultSdk = buildSdk(config, config.afriexApiKey, config.environment);
      }
      return defaultSdk;
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

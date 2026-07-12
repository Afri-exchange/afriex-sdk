import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { AfriexSDK } from "@afriex/sdk";
import type { McpServerConfig } from "./config.js";
import { registerAllTools } from "./tools/index.js";
import { getLogger } from "./logger.js";

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

/**
 * Wraps every `server.registerTool(name, config, callback)` call so each tool
 * invocation is logged (start, duration, success/error) without touching the
 * ~28 individual tool definitions across tools/*.ts. Only the 3-arg form is
 * used anywhere in this codebase (verified via grep), so the generic
 * overloads registerTool otherwise supports aren't a concern here — cast to
 * `unknown` because the SDK's actual signature is a schema-inferring generic
 * a wrapper can't reproduce without duplicating it.
 */
function instrumentToolLogging(server: McpServer): void {
  const logger = getLogger().child({ module: "tools" });
  const originalRegisterTool = server.registerTool.bind(server) as (...args: unknown[]) => unknown;

  (server as unknown as { registerTool: (...args: unknown[]) => unknown }).registerTool = (
    ...args: unknown[]
  ) => {
    const [name, toolConfig, callback] = args as [string, unknown, (...cbArgs: unknown[]) => Promise<unknown>];
    const wrapped = async (...cbArgs: unknown[]) => {
      const startedAt = Date.now();
      logger.debug({ tool: name }, "Tool call started");
      try {
        const result = await callback(...cbArgs);
        const isError = Boolean((result as { isError?: boolean } | undefined)?.isError);
        logger[isError ? "warn" : "info"](
          { tool: name, durationMs: Date.now() - startedAt, isError },
          "Tool call finished",
        );
        return result;
      } catch (error) {
        logger.error({ tool: name, durationMs: Date.now() - startedAt, err: error }, "Tool call threw");
        throw error;
      }
    };
    return originalRegisterTool(name, toolConfig, wrapped);
  };
}

export function createMcpServer(config: McpServerConfig): McpServer {
  const server = new McpServer({
    name: "afriex",
    version: "1.0.0",
  });
  instrumentToolLogging(server);

  const sdkCache = new Map<string, AfriexSDK>();

  const getSdk = (extra?: ToolExtra): AfriexSDK => {
    const creds = resolveCredentials(config, extra);
    if (!creds) {
      getLogger().warn(
        { hasAuthInfo: Boolean(extra?.authInfo) },
        "Tool call rejected: no Afriex API key available (no OAuth grant, header, or server config)",
      );
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
      getLogger().debug({ environment: creds.environment, cacheSize: sdkCache.size + 1 }, "Building new AfriexSDK instance");
      sdk = buildSdk(config, creds.apiKey, creds.environment);
      sdkCache.set(cacheKey, sdk);
    }
    return sdk;
  };

  const registry: ToolRegistry = { server, getSdk };

  registerAllTools(registry);

  return server;
}

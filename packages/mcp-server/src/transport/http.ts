import express from "express";
import cors from "cors";
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { type McpServerConfig, validateHttpConfig } from "../config.js";
import { createAuthMiddleware } from "../auth/index.js";
import { createOAuthProvider } from "../oauth/providers/index.js";

type McpRequest = IncomingMessage & { auth?: AuthInfo };

export async function startHttpServer(
  server: McpServer,
  config: McpServerConfig,
): Promise<void> {
  validateHttpConfig(config);

  const app = express();

  app.use(cors());
  app.use(express.json());

  const authMiddleware = createAuthMiddleware(config);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  app.post("/mcp", authMiddleware, async (req, res) => {
    try {
      await transport.handleRequest(
        req as McpRequest,
        res as ServerResponse,
        (req as express.Request).body,
      );
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal server error",
          message: String(error),
        });
      }
    }
  });

  if (config.authMode === "oauth") {
    setupOAuthEndpoints(app, config);
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  return new Promise((resolve) => {
    const httpServer = app.listen(config.port, config.host, () => {
      console.error(`Afriex MCP server running on http://${config.host}:${config.port}`);
      console.error(`MCP endpoint: POST http://${config.host}:${config.port}/mcp`);
      console.error(`Auth mode: ${config.authMode}`);
      resolve();
    });
    httpServer.on("error", (error) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });
  });
}

function setupOAuthEndpoints(app: express.Express, config: McpServerConfig): void {
  const provider = createOAuthProvider(config);
  const baseUrl = config.oauth?.issuerUrl || config.oauth?.audience || `http://${config.host}:${config.port}`;

  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    const metadata = provider.getAuthorizationServerMetadata(baseUrl);
    res.json({
      resource: config.oauth?.audience || baseUrl,
      authorization_servers: [metadata.issuer],
      scopes: metadata.scopes_supported ?? [],
    });
  });

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json(provider.getAuthorizationServerMetadata(baseUrl));
  });

  // Each provider mounts whatever it hosts itself — everything for "custom",
  // nothing for "auth0" (Auth0 hosts its own endpoints directly), a 501 stub
  // for "workos" (see oauth/providers/workos.ts).
  provider.mountRoutes(app, config);
}

import express from "express";
import cors from "cors";
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServerConfig } from "../config.js";
import { createAuthMiddleware } from "../auth/index.js";

type McpRequest = IncomingMessage & { auth?: AuthInfo };

export async function startHttpServer(
  server: McpServer,
  config: McpServerConfig,
): Promise<void> {
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

function setupOAuthEndpoints(app: express.Express, _config: McpServerConfig): void {
  const serverBaseUrl = `http://${_config.host}:${_config.port}`;

  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({
      resource: serverBaseUrl,
      authorization_servers: [_config.oauth?.issuerUrl || serverBaseUrl],
      scopes: ["read", "write"],
    });
  });

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    const issuer = _config.oauth?.issuerUrl || serverBaseUrl;
    res.json({
      issuer,
      authorization_endpoint: _config.oauth?.authorizationEndpoint || `${issuer}/authorize`,
      token_endpoint: _config.oauth?.tokenEndpoint || `${issuer}/token`,
      token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["read", "write"],
    });
  });

  app.post("/register", (_req, res) => {
    res.status(501).json({
      error: "not_implemented",
      message:
        "Dynamic client registration is not implemented. " +
        "Configure your OAuth client ID manually or use a supported external authorization server.",
    });
  });
}

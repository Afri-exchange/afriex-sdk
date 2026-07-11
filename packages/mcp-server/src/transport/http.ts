import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { type McpServerConfig, validateHttpConfig } from "../config.js";
import { createAuthMiddleware } from "../auth/index.js";
import { createOAuthProvider } from "../oauth/providers/index.js";
import { toResourceUrl } from "../oauth/types.js";
import { getLogger, reqLogger } from "../logger.js";

type McpRequest = IncomingMessage & { auth?: AuthInfo };

export async function startHttpServer(
  server: McpServer,
  config: McpServerConfig,
): Promise<void> {
  validateHttpConfig(config);
  const logger = getLogger();

  const app = express();
  app.disable("x-powered-by");

  // Mounted before everything else so every request is logged — including
  // ones that never reach a route (bad JSON body, CORS preflight, 404s) —
  // with a request id that correlates across all log lines for that request.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "debug";
      },
    }),
  );

  app.use(cors());
  app.use(express.json());

  const authMiddleware = createAuthMiddleware(config);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  // The Streamable HTTP spec (and clients that follow it — several MCP
  // clients probe this as part of connecting) allows GET (to open a
  // server-initiated SSE stream) and DELETE (session termination) on the
  // same endpoint as POST, not just POST. transport.handleRequest() already
  // branches on method internally; without routes for GET/DELETE here,
  // Express fell through to its default 404 HTML page for those methods
  // instead of ever reaching the transport or auth middleware — which some
  // clients treated as "this isn't a valid MCP server" rather than "this
  // method isn't supported here."
  const mcpHandler = async (req: express.Request, res: express.Response) => {
    // Hints to any nginx-family proxy in front of this server not to buffer
    // the SSE response (Traefik itself ignores this, but it's a no-cost
    // safety net if one is ever added — e.g. a CDN — in front of Traefik).
    // The actual fix for buffering/compression breaking SSE lives in the
    // reverse proxy config, not here — see the deploy notes.
    res.setHeader("X-Accel-Buffering", "no");
    const log = reqLogger(req);
    const startedAt = Date.now();
    log.debug(
      {
        mcpMethod: req.method,
        mcpSessionId: req.headers["mcp-session-id"],
        hasAuthHeader: Boolean(req.headers.authorization),
        rpcMethod: req.method === "POST" ? (req.body as { method?: string } | undefined)?.method : undefined,
      },
      "MCP request received",
    );
    try {
      await transport.handleRequest(req as McpRequest, res as ServerResponse, req.body);
      log.debug({ durationMs: Date.now() - startedAt, statusCode: res.statusCode }, "MCP request handled");
    } catch (error) {
      log.error({ err: error, durationMs: Date.now() - startedAt }, "MCP request failed");
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal server error",
          message: String(error),
        });
      }
    }
  };

  app.post("/mcp", authMiddleware, mcpHandler);
  app.get("/mcp", authMiddleware, mcpHandler);
  app.delete("/mcp", authMiddleware, mcpHandler);

  if (config.authMode === "oauth") {
    setupOAuthEndpoints(app, config);
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  return new Promise((resolve) => {
    const httpServer = app.listen(config.port, config.host, () => {
      logger.info(
        { host: config.host, port: config.port, authMode: config.authMode },
        `Afriex MCP server running on http://${config.host}:${config.port} (MCP endpoint: POST /mcp, auth mode: ${config.authMode})`,
      );
      resolve();
    });
    httpServer.on("error", (error) => {
      logger.fatal({ err: error }, "Failed to start server");
      process.exit(1);
    });
  });
}

function setupOAuthEndpoints(app: express.Express, config: McpServerConfig): void {
  const logger = getLogger().child({ module: "oauth-discovery" });
  const provider = createOAuthProvider(config);
  const baseUrl = config.oauth?.issuerUrl || config.oauth?.audience || `http://${config.host}:${config.port}`;
  logger.info(
    { provider: provider.name, baseUrl, audience: config.oauth?.audience },
    "OAuth endpoints mounted",
  );

  const protectedResourceHandler = (req: express.Request, res: express.Response) => {
    const metadata = provider.getAuthorizationServerMetadata(baseUrl);
    reqLogger(req).debug({ path: req.path }, "Protected resource metadata requested");
    res.json({
      // RFC 9728: this MUST exactly equal the URL the client connects to
      // (the /mcp endpoint, not just the origin) or spec-compliant clients
      // reject the metadata outright.
      resource: toResourceUrl(config.oauth?.audience || baseUrl),
      authorization_servers: [metadata.issuer],
      scopes: metadata.scopes_supported ?? [],
    });
  };

  // RFC 9728 §3.1 defines two valid discovery locations for a resource that
  // lives at a sub-path: the origin-root well-known URI, and one with the
  // resource's own path appended. Different clients probe different ones —
  // mount both so either strategy finds the same metadata.
  app.get("/.well-known/oauth-protected-resource", protectedResourceHandler);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResourceHandler);

  app.get("/.well-known/oauth-authorization-server", (req, res) => {
    reqLogger(req).debug("Authorization server metadata requested");
    res.json(provider.getAuthorizationServerMetadata(baseUrl));
  });

  // Each provider mounts whatever it hosts itself — everything for "custom",
  // nothing for "auth0" (Auth0 hosts its own endpoints directly), a 501 stub
  // for "workos" (see oauth/providers/workos.ts).
  provider.mountRoutes(app, config);
}

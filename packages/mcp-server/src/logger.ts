import pino from "pino";
import type { Request } from "express";

/**
 * Paths redacted regardless of which logger call site produced them — tokens,
 * API keys, and secrets must never reach log output (stdout on most deploys
 * is captured by a log aggregator outside our control). Covers both the
 * pino-http auto-logged req/res objects and ad-hoc fields we log ourselves.
 */
const REDACT_PATHS = [
  "req.headers.authorization",
  'req.headers["x-afriex-api-key"]',
  'req.headers["x-api-key"]',
  "headers.authorization",
  'headers["x-afriex-api-key"]',
  'headers["x-api-key"]',
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "afriexApiKey",
  "afx_key",
  "encryptedApiKey",
  "client_secret",
  "clientSecret",
  "code",
  "code_verifier",
  "codeVerifier",
];

let root: pino.Logger | undefined;

/**
 * Must be called once at startup with the configured level before any
 * `getLogger()`/`reqLogger()` call — those fall back to an "info"-level
 * logger if used first, so early callers (config loading, before the level
 * is known) won't retroactively pick up a --debug flag.
 */
export function initLogger(level: string): pino.Logger {
  const pretty = process.env.NODE_ENV !== "production" && process.stdout.isTTY;
  root = pino({
    level: level || "info",
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    ...(pretty
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
        }
      : {}),
  });
  return root;
}

export function getLogger(): pino.Logger {
  return root ?? initLogger(process.env.AFRIEX_LOG_LEVEL || "info");
}

/**
 * Prefer this inside Express handlers: pino-http (mounted in transport/http.ts)
 * attaches a per-request child logger carrying a request id, so log lines
 * from the same request correlate. Falls back to the root logger for code
 * paths that run outside pino-http's middleware (e.g. before it's mounted).
 */
export function reqLogger(req: Request): pino.Logger {
  return (req as unknown as { log?: pino.Logger }).log ?? getLogger();
}

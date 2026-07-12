import Database from "better-sqlite3";
import { getLogger } from "../logger.js";

let db: Database.Database | undefined;

export function getDb(dbPath: string): Database.Database {
  if (db) return db;

  const logger = getLogger().child({ module: "oauth-db" });
  try {
    db = new Database(dbPath);
  } catch (err) {
    logger.fatal({ err, dbPath }, "Failed to open OAuth database — check OAUTH_DB_PATH and that its directory is writable");
    throw err;
  }
  logger.info({ dbPath }, "OAuth database opened");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id TEXT PRIMARY KEY,
      client_secret_hash TEXT,
      client_name TEXT,
      redirect_uris TEXT NOT NULL,
      token_endpoint_auth_method TEXT NOT NULL,
      grant_types TEXT NOT NULL,
      response_types TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
      code_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL,
      environment TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT '',
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
      token_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL,
      environment TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT '',
      expires_at INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_signing_keys (
      kid TEXT PRIMARY KEY,
      private_key_pem TEXT NOT NULL,
      public_jwk TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_auth_codes_expires ON oauth_authorization_codes (expires_at);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON oauth_refresh_tokens (expires_at);
  `);

  return db;
}

/** Best-effort cleanup of expired rows. Safe to call periodically; SQLite handles it fast even unindexed at this scale. */
export function pruneExpired(database: Database.Database): void {
  const now = Date.now();
  database.prepare("DELETE FROM oauth_authorization_codes WHERE expires_at < ?").run(now);
  database.prepare("DELETE FROM oauth_refresh_tokens WHERE expires_at < ? AND revoked = 1").run(now);
}

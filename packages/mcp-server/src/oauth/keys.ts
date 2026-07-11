import { generateKeyPair, exportJWK, exportPKCS8, importPKCS8, type CryptoKey, type JWK } from "jose";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { getLogger } from "../logger.js";

export interface SigningKey {
  kid: string;
  privateKey: CryptoKey;
  publicJwk: JWK;
}

interface SigningKeyRow {
  kid: string;
  private_key_pem: string;
  public_jwk: string;
}

// Both the custom provider's /token, /authorize, and JWKS routes and the
// resource-server auth middleware call this independently at startup. Without
// per-db caching, two concurrent first-boot calls can each see no existing
// row, each generate a *different* key, and each insert — leaving the token
// issuer and the token validator disagreeing about which key is active.
const inflight = new WeakMap<Database.Database, Promise<SigningKey>>();

/**
 * Loads the active RS256 signing key, or generates and persists one on first
 * boot. Persisting is what lets previously-issued tokens keep validating (via
 * the JWKS endpoint) across server restarts.
 */
export function loadOrCreateSigningKey(db: Database.Database): Promise<SigningKey> {
  const cached = inflight.get(db);
  if (cached) return cached;

  const promise = loadOrCreateSigningKeyUncached(db);
  inflight.set(db, promise);
  return promise;
}

async function loadOrCreateSigningKeyUncached(db: Database.Database): Promise<SigningKey> {
  const logger = getLogger().child({ module: "oauth-keys" });

  const existing = await selectActiveKey(db);
  if (existing) {
    logger.info({ kid: existing.kid }, "Loaded existing OAuth signing key");
    return existing;
  }

  logger.info("No active OAuth signing key found — generating a new one");
  const { publicKey, privateKey } = await generateKeyPair("RS256", { modulusLength: 2048, extractable: true });
  const kid = randomUUID();
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  const privateKeyPem = await exportPKCS8(privateKey);

  // Atomic no-op if a concurrent process (e.g. another replica) already
  // inserted one — the WHERE NOT EXISTS makes this safe across processes,
  // not just within this one (the WeakMap cache above only covers that).
  db.prepare(
    `INSERT INTO oauth_signing_keys (kid, private_key_pem, public_jwk, created_at, active)
     SELECT ?, ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM oauth_signing_keys WHERE active = 1)`,
  ).run(kid, privateKeyPem, JSON.stringify(publicJwk), Date.now());

  // Re-select rather than trust the values we just generated: if another
  // process won the race, this returns *their* key instead of ours.
  const winner = await selectActiveKey(db);
  if (!winner) {
    logger.fatal("Failed to load or create an OAuth signing key after insert");
    throw new Error("Failed to load or create an OAuth signing key.");
  }
  if (winner.kid !== kid) {
    logger.info({ kid: winner.kid }, "Lost signing-key generation race to another process — using their key");
  } else {
    logger.info({ kid: winner.kid }, "Generated and persisted new OAuth signing key");
  }
  return winner;
}

async function selectActiveKey(db: Database.Database): Promise<SigningKey | undefined> {
  const row = db
    .prepare<[], SigningKeyRow>(
      "SELECT kid, private_key_pem, public_jwk FROM oauth_signing_keys WHERE active = 1 ORDER BY created_at DESC LIMIT 1",
    )
    .get();
  if (!row) return undefined;
  const privateKey = await importPKCS8(row.private_key_pem, "RS256");
  return { kid: row.kid, privateKey, publicJwk: JSON.parse(row.public_jwk) as JWK };
}

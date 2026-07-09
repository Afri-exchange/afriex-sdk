import { generateKeyPair, exportJWK, exportPKCS8, importPKCS8, type CryptoKey, type JWK } from "jose";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

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

/**
 * Loads the active RS256 signing key, or generates and persists one on first
 * boot. Persisting is what lets previously-issued tokens keep validating (via
 * the JWKS endpoint) across server restarts.
 */
export async function loadOrCreateSigningKey(db: Database.Database): Promise<SigningKey> {
  const row = db
    .prepare<[], SigningKeyRow>(
      "SELECT kid, private_key_pem, public_jwk FROM oauth_signing_keys WHERE active = 1 ORDER BY created_at DESC LIMIT 1",
    )
    .get();

  if (row) {
    const privateKey = await importPKCS8(row.private_key_pem, "RS256");
    return { kid: row.kid, privateKey, publicJwk: JSON.parse(row.public_jwk) as JWK };
  }

  const { publicKey, privateKey } = await generateKeyPair("RS256", { modulusLength: 2048, extractable: true });
  const kid = randomUUID();
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  const privateKeyPem = await exportPKCS8(privateKey);

  db.prepare(
    "INSERT INTO oauth_signing_keys (kid, private_key_pem, public_jwk, created_at, active) VALUES (?, ?, ?, ?, 1)",
  ).run(kid, privateKeyPem, JSON.stringify(publicJwk), Date.now());

  return { kid, privateKey, publicJwk };
}

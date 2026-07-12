import { randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte AES-256 key from the configured secret. Accepts a 64-char
 * hex string (already 32 bytes) directly, or hashes anything else with SHA-256
 * so operators aren't forced into a specific input format.
 */
export function loadEncryptionKey(secret: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

export function decryptSecret(encoded: string, key: Buffer): string {
  const raw = Buffer.from(encoded, "base64url");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** SHA-256 hex digest, used so raw codes/tokens are never stored at rest — only their hash. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function verifyPkce(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const computed = createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
  return safeEqual(computed, codeChallenge);
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

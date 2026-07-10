import type { Express, Request, Response } from "express";
import express from "express";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { AfriexSDK } from "@afriex/sdk";
import type { McpServerConfig } from "../../config.js";
import type { OAuthProvider, AuthorizationServerMetadata } from "../types.js";
import { getDb, pruneExpired } from "../db.js";
import { loadOrCreateSigningKey } from "../keys.js";
import { encryptSecret, hashToken, randomToken, verifyPkce, loadEncryptionKey, safeEqual } from "../crypto.js";

const AUTH_CODE_TTL_MS = 60_000;

interface ClientRow {
  client_id: string;
  client_secret_hash: string | null;
  client_name: string | null;
  redirect_uris: string;
  token_endpoint_auth_method: string;
  grant_types: string;
  response_types: string;
}

interface AuthCodeRow {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  encrypted_api_key: string;
  environment: string;
  scope: string;
  expires_at: number;
  used: number;
}

interface RefreshTokenRow {
  client_id: string;
  encrypted_api_key: string;
  environment: string;
  scope: string;
  expires_at: number;
  revoked: number;
}

/**
 * Fully self-hosted OAuth 2.1 authorization server. "Login" is a consent
 * screen that takes the caller's existing Afriex API key, confirms it works
 * against the real API, then issues tokens bound to it — no separate
 * identity system to build or operate. See ../types.ts for why this is one
 * of several swappable OAuthProvider implementations.
 */
export function createCustomProvider(): OAuthProvider {
  return {
    name: "custom",
    getAuthorizationServerMetadata(baseUrl: string): AuthorizationServerMetadata {
      return {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        registration_endpoint: `${baseUrl}/register`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["mcp"],
      };
    },
    mountRoutes(app, config) {
      mountCustomRoutes(app, config);
    },
  };
}

function mountCustomRoutes(app: Express, config: McpServerConfig): void {
  const oauth = config.oauth;
  if (!oauth?.encryptionKey) {
    throw new Error("OAUTH_ENCRYPTION_KEY is required for the custom OAuth provider.");
  }
  if (!oauth.audience) {
    throw new Error("OAUTH_AUDIENCE is required for the custom OAuth provider.");
  }

  const db = getDb(oauth.dbPath || "./afriex-mcp-oauth.db");
  const encKey = loadEncryptionKey(oauth.encryptionKey);
  const accessTtl = oauth.accessTokenTtlSeconds ?? 3600;
  const refreshTtl = oauth.refreshTokenTtlSeconds ?? 60 * 60 * 24 * 30;
  const audience = oauth.audience;
  const issuer = oauth.issuerUrl || audience;

  const signingKeyPromise = loadOrCreateSigningKey(db);
  const urlencoded = express.urlencoded({ extended: false });

  function getClient(clientId: string): ClientRow | undefined {
    return db.prepare<[string], ClientRow>("SELECT * FROM oauth_clients WHERE client_id = ?").get(clientId);
  }

  // --- Dynamic Client Registration (RFC 7591) ---
  app.post("/register", express.json(), (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const redirectUris = body.redirect_uris;

    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      res.status(400).json({
        error: "invalid_client_metadata",
        error_description: "redirect_uris is required and must be a non-empty array",
      });
      return;
    }

    for (const uri of redirectUris) {
      if (typeof uri !== "string" || !isAllowedRedirectUri(uri)) {
        res.status(400).json({
          error: "invalid_redirect_uri",
          error_description: `redirect_uri must be https://, or http://localhost for local development: ${String(uri)}`,
        });
        return;
      }
    }

    const authMethod = typeof body.token_endpoint_auth_method === "string" ? body.token_endpoint_auth_method : "none";
    if (authMethod !== "none" && authMethod !== "client_secret_post") {
      res.status(400).json({
        error: "invalid_client_metadata",
        error_description: "token_endpoint_auth_method must be 'none' or 'client_secret_post'",
      });
      return;
    }

    const grantTypes = Array.isArray(body.grant_types) ? body.grant_types : ["authorization_code", "refresh_token"];
    const responseTypes = Array.isArray(body.response_types) ? body.response_types : ["code"];
    const clientName = typeof body.client_name === "string" ? body.client_name : null;

    const clientId = randomUUID();
    let clientSecret: string | undefined;
    let clientSecretHash: string | null = null;
    if (authMethod === "client_secret_post") {
      clientSecret = randomToken(32);
      clientSecretHash = hashToken(clientSecret);
    }

    db.prepare(
      `INSERT INTO oauth_clients (client_id, client_secret_hash, client_name, redirect_uris, token_endpoint_auth_method, grant_types, response_types, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      clientId,
      clientSecretHash,
      clientName,
      JSON.stringify(redirectUris),
      authMethod,
      JSON.stringify(grantTypes),
      JSON.stringify(responseTypes),
      Date.now(),
    );

    res.status(201).json({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: authMethod,
      grant_types: grantTypes,
      response_types: responseTypes,
      client_name: clientName,
    });
  });

  // --- Authorization endpoint: render consent form ---
  app.get("/authorize", (req: Request, res: Response) => {
    const { client_id, redirect_uri, response_type, code_challenge, code_challenge_method, state, scope } = req.query;

    if (typeof client_id !== "string" || typeof redirect_uri !== "string") {
      res.status(400).send(renderErrorPage("This authorization link is missing required parameters."));
      return;
    }

    const client = getClient(client_id);
    const redirectUris: string[] = client ? JSON.parse(client.redirect_uris) : [];
    if (!client || !redirectUris.includes(redirect_uri)) {
      // Not safe to redirect back — the redirect_uri itself is unverified. Show an error in-page instead.
      res.status(400).send(renderErrorPage("Unknown client or redirect_uri. This link may be malformed or expired."));
      return;
    }

    if (response_type !== "code") {
      redirectWithError(res, redirect_uri, "unsupported_response_type", "Only 'code' is supported", state);
      return;
    }
    if (typeof code_challenge !== "string" || code_challenge_method !== "S256") {
      redirectWithError(res, redirect_uri, "invalid_request", "PKCE with S256 is required", state);
      return;
    }

    res.status(200).send(
      renderConsentPage({
        clientName: client.client_name || client.client_id,
        clientId: client_id,
        redirectUri: redirect_uri,
        state: typeof state === "string" ? state : "",
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        scope: typeof scope === "string" ? scope : "",
      }),
    );
  });

  // --- Authorization endpoint: handle consent submission ---
  app.post("/authorize", urlencoded, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const { client_id, redirect_uri, state, code_challenge, code_challenge_method, scope, afriex_api_key, afriex_environment } = body;

    const client = client_id ? getClient(client_id) : undefined;
    const redirectUris: string[] = client ? JSON.parse(client.redirect_uris) : [];
    if (!client || !redirect_uri || !redirectUris.includes(redirect_uri)) {
      res.status(400).send(renderErrorPage("Unknown client or redirect_uri."));
      return;
    }

    const environment = afriex_environment === "production" ? "production" : "staging";
    const consentParams = {
      clientName: client.client_name || client.client_id,
      clientId: client_id!,
      redirectUri: redirect_uri,
      state: state || "",
      codeChallenge: code_challenge || "",
      codeChallengeMethod: code_challenge_method || "",
      scope: scope || "",
    };

    if (!afriex_api_key || afriex_api_key.trim().length === 0) {
      res.status(200).send(renderConsentPage({ ...consentParams, error: "Enter your Afriex API key to continue." }));
      return;
    }

    const keyIsValid = await verifyAfriexApiKey(afriex_api_key.trim(), environment);
    if (!keyIsValid) {
      res.status(200).send(
        renderConsentPage({
          ...consentParams,
          error: "That API key didn't work against the Afriex API. Double-check it and try again.",
        }),
      );
      return;
    }

    const code = randomToken(32);
    db.prepare(
      `INSERT INTO oauth_authorization_codes
        (code_hash, client_id, redirect_uri, code_challenge, code_challenge_method, encrypted_api_key, environment, scope, expires_at, used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    ).run(
      hashToken(code),
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      encryptSecret(afriex_api_key.trim(), encKey),
      environment,
      scope || "",
      Date.now() + AUTH_CODE_TTL_MS,
    );

    const redirectTo = new URL(redirect_uri);
    redirectTo.searchParams.set("code", code);
    if (state) redirectTo.searchParams.set("state", state);
    res.redirect(redirectTo.toString());
  });

  // --- Token endpoint ---
  app.post("/token", urlencoded, async (req: Request, res: Response) => {
    pruneExpired(db);
    const body = (req.body ?? {}) as Record<string, string | undefined>;

    try {
      if (body.grant_type === "authorization_code") {
        await handleAuthorizationCodeGrant(req, res);
      } else if (body.grant_type === "refresh_token") {
        await handleRefreshTokenGrant(req, res);
      } else {
        res.status(400).json({ error: "unsupported_grant_type" });
      }
    } catch {
      res.status(500).json({ error: "server_error" });
    }
  });

  async function handleAuthorizationCodeGrant(req: Request, res: Response): Promise<void> {
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const { code, redirect_uri, client_id, code_verifier } = body;

    if (!code || !redirect_uri || !client_id || !code_verifier) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    if (!(await authenticateClient(req, client_id))) {
      res.status(401).json({ error: "invalid_client" });
      return;
    }

    const codeHash = hashToken(code);
    const row = db.prepare<[string], AuthCodeRow>("SELECT * FROM oauth_authorization_codes WHERE code_hash = ?").get(codeHash);

    if (!row || row.used || row.expires_at < Date.now() || row.client_id !== client_id || row.redirect_uri !== redirect_uri) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
    if (!verifyPkce(code_verifier, row.code_challenge, row.code_challenge_method)) {
      res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
      return;
    }

    // Single-use: mark consumed before issuing tokens so a replayed code can never succeed twice.
    db.prepare("UPDATE oauth_authorization_codes SET used = 1 WHERE code_hash = ?").run(codeHash);

    const tokens = await issueTokens(client_id, row.encrypted_api_key, row.environment, row.scope);
    res.status(200).json(tokens);
  }

  async function handleRefreshTokenGrant(req: Request, res: Response): Promise<void> {
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const { refresh_token, client_id } = body;

    if (!refresh_token) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    const tokenHash = hashToken(refresh_token);
    const row = db.prepare<[string], RefreshTokenRow>("SELECT * FROM oauth_refresh_tokens WHERE token_hash = ?").get(tokenHash);

    if (!row || row.revoked || row.expires_at < Date.now()) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
    if (client_id && client_id !== row.client_id) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
    if (!(await authenticateClient(req, row.client_id))) {
      res.status(401).json({ error: "invalid_client" });
      return;
    }

    // Rotation: revoke the presented refresh token so it can't be replayed once a new one is issued.
    db.prepare("UPDATE oauth_refresh_tokens SET revoked = 1 WHERE token_hash = ?").run(tokenHash);

    const tokens = await issueTokens(row.client_id, row.encrypted_api_key, row.environment, row.scope);
    res.status(200).json(tokens);
  }

  async function authenticateClient(req: Request, clientId: string): Promise<boolean> {
    const client = getClient(clientId);
    if (!client) return false;
    if (client.token_endpoint_auth_method === "none") return true;

    const body = (req.body ?? {}) as Record<string, string | undefined>;
    let providedSecret = body.client_secret;

    const authHeader = req.headers.authorization;
    if (!providedSecret && authHeader?.startsWith("Basic ")) {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
      const sepIndex = decoded.indexOf(":");
      if (sepIndex !== -1 && decoded.slice(0, sepIndex) === clientId) {
        providedSecret = decoded.slice(sepIndex + 1);
      }
    }

    if (!providedSecret || !client.client_secret_hash) return false;
    return safeEqual(hashToken(providedSecret), client.client_secret_hash);
  }

  async function issueTokens(clientId: string, encryptedApiKey: string, environment: string, scope: string) {
    const { privateKey, kid } = await signingKeyPromise;
    const now = Math.floor(Date.now() / 1000);

    // The access token carries the Afriex API key only as our own AES-256-GCM
    // ciphertext (see oauth/crypto.ts) — never in the clear. The MCP client
    // holding this JWT can read the payload (JWTs aren't encrypted) but has
    // no way to recover the underlying key from afx_key without our server-side
    // OAUTH_ENCRYPTION_KEY.
    const accessToken = await new SignJWT({
      client_id: clientId,
      scope,
      afx_key: encryptedApiKey,
      afx_env: environment,
    })
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuedAt(now)
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(clientId)
      .setExpirationTime(now + accessTtl)
      .sign(privateKey);

    const refreshToken = randomToken(32);
    db.prepare(
      `INSERT INTO oauth_refresh_tokens (token_hash, client_id, encrypted_api_key, environment, scope, expires_at, revoked, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    ).run(hashToken(refreshToken), clientId, encryptedApiKey, environment, scope, Date.now() + refreshTtl * 1000, Date.now());

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: accessTtl,
      refresh_token: refreshToken,
      scope,
    };
  }

  // --- JWKS ---
  app.get("/.well-known/jwks.json", async (_req: Request, res: Response) => {
    const { publicJwk } = await signingKeyPromise;
    res.json({ keys: [publicJwk] });
  });
}

async function verifyAfriexApiKey(apiKey: string, environment: "staging" | "production"): Promise<boolean> {
  try {
    const sdk = new AfriexSDK({ apiKey, environment, enableLogging: false });
    await sdk.balance.getBalance({ currencies: "USD" });
    return true;
  } catch {
    return false;
  }
}

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) return true;
    return false;
  } catch {
    return false;
  }
}

function redirectWithError(
  res: Response,
  redirectUri: string,
  error: string,
  description: string,
  state: unknown,
): void {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (typeof state === "string" && state) url.searchParams.set("state", state);
  res.redirect(url.toString());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderErrorPage(message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Afriex — Authorization Error</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #1a1a1a;">
<h2>Authorization Error</h2><p>${escapeHtml(message)}</p></body></html>`;
}

interface ConsentPageParams {
  clientName: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  error?: string;
}

function renderConsentPage(params: ConsentPageParams): string {
  const { clientName, clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scope, error } = params;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Authorize ${escapeHtml(clientName)} — Afriex</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 420px; margin: 60px auto; color: #1a1a1a;">
  <h2>Connect ${escapeHtml(clientName)} to Afriex</h2>
  <p>This application is requesting access to your Afriex business account through the MCP server. It will be able to act on your account using the API key you provide below.</p>
  ${error ? `<p style="color:#b00020;">${escapeHtml(error)}</p>` : ""}
  <form method="POST" action="/authorize">
    <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
    <input type="hidden" name="state" value="${escapeHtml(state)}" />
    <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}" />
    <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}" />
    <input type="hidden" name="scope" value="${escapeHtml(scope)}" />

    <label style="display:block; margin-top:16px;">Afriex API key
      <input type="password" name="afriex_api_key" required style="display:block; width:100%; padding:8px; margin-top:4px; box-sizing:border-box;" />
    </label>

    <label style="display:block; margin-top:16px;">Environment
      <select name="afriex_environment" style="display:block; width:100%; padding:8px; margin-top:4px;">
        <option value="staging">Staging</option>
        <option value="production">Production</option>
      </select>
    </label>

    <button type="submit" style="margin-top:24px; padding:10px 20px; background:#1a1a1a; color:#fff; border:none; border-radius:6px; cursor:pointer;">
      Authorize
    </button>
  </form>
</body></html>`;
}

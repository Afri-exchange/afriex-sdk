# @afriex/mcp-server

MCP server for the [Afriex Business API](https://docs.afriex.com) — let AI assistants send
and receive payments across Africa.

## Quick Start

```bash
# stdio mode (default) — for Claude Desktop, Claude Code, Cursor
export AFRIEX_API_KEY="sk_..."
npx @afriex/mcp-server

# HTTP mode — for remote access
export AFRIEX_API_KEY="sk_..."
npx @afriex/mcp-server --http --port=3001
```

## Tools

The server exposes 29 tools covering every Afriex API endpoint:

| Tool | Description |
|------|-------------|
| `afriex_get_balance` | Get wallet balances for one or more currencies (omit to get all) |
| `afriex_top_up_sandbox` | Credit wallet with test funds (sandbox only) |
| `afriex_create_customer` | Create a new customer |
| `afriex_get_customer` | Get customer by ID |
| `afriex_list_customers` | List customers with pagination |
| `afriex_update_customer` | Partially update a customer's profile (name/email/phone) |
| `afriex_update_customer_kyc` | Update customer KYC information |
| `afriex_verify_customer` | Verify a customer document (BVN) |
| `afriex_delete_customer` | Delete a customer |
| `afriex_create_payment_method` | Create a bank account or mobile money payment method |
| `afriex_get_payment_method` | Get payment method by ID |
| `afriex_list_payment_methods` | List payment methods |
| `afriex_delete_payment_method` | Delete a payment method |
| `afriex_get_institutions` | List banks/mobile money providers for a country |
| `afriex_resolve_account` | Resolve account holder details |
| `afriex_get_crypto_wallet` | Get/create crypto wallet (USDT/USDC) |
| `afriex_list_virtual_accounts` | List virtual accounts |
| `afriex_create_virtual_account` | Create a virtual account |
| `afriex_get_pool_account` | Get pool account for a country |
| `afriex_create_transaction` | Send, receive, or swap funds |
| `afriex_get_transaction` | Get transaction details |
| `afriex_list_transactions` | List transactions with filters |
| `afriex_authorize_transaction` | Authorize a pending transaction with an OTP |
| `afriex_get_rates` | Get real-time exchange rates |
| `afriex_convert_currency` | Convert an amount between currencies |
| `afriex_create_checkout_session` | Create a hosted checkout page |
| `afriex_verify_webhook_signature` | Verify a webhook signature |
| `afriex_verify_and_parse_webhook` | Verify and parse a webhook payload |
| `afriex_trigger_test_webhook` | Trigger a test webhook (sandbox only) |

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AFRIEX_API_KEY` | stdio only | — | Your Afriex API key. Required in stdio mode. In `--http` mode it's optional — the fallback for callers that don't send their own `x-afriex-api-key` header |
| `AFRIEX_ENVIRONMENT` | No | `staging` | `staging` or `production` |
| `AFRIEX_MCP_AUTH_MODE` | No | `api-key` | Auth mode: `api-key`, `bearer`, or `oauth` |
| `AFRIEX_MCP_BEARER_TOKEN` | See below | — | Bearer token for MCP clients (required in `bearer` mode) |
| `AFRIEX_WEBHOOK_PUBLIC_KEY` | No | — | Public key for webhook signature verification |
| `AFRIEX_LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, or `error` |
| `PORT` | No | `3001` | HTTP server port |
| `HOST` | No | `0.0.0.0` | HTTP server host |

### OAuth Configuration

`OAUTH_PROVIDER` picks which authorization server backs `--oauth` mode. All three implement the same interface (see `src/oauth/types.ts`), so switching is a config change, not a code change.

| Variable | Applies to | Description |
|----------|-----------|-------------|
| `OAUTH_PROVIDER` | all | `custom` (default, self-hosted) \| `workos` \| `auth0` |
| `OAUTH_AUDIENCE` | all | **Required.** This server's public URL for `custom`, or your provider's API identifier for `workos`/`auth0` |
| `OAUTH_ISSUER_URL` | workos, auth0 | Issuer URL. Defaults to `OAUTH_AUDIENCE` for `custom` |
| `OAUTH_JWKS_URL` | workos, auth0 | JWKS URL, if not derivable from the issuer |
| `OAUTH_ENCRYPTION_KEY` | custom | **Required.** 32-byte hex key that encrypts Afriex API keys at rest. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OAUTH_DB_PATH` | custom | SQLite file path (default `./afriex-mcp-oauth.db`) — stores registered clients, auth codes, refresh tokens, and the signing key |
| `OAUTH_ACCESS_TOKEN_TTL` | custom | Access token lifetime in seconds (default `3600`) |
| `OAUTH_REFRESH_TOKEN_TTL` | custom | Refresh token lifetime in seconds (default 30 days) |
| `OAUTH_AUTH0_DOMAIN` | auth0 | Your Auth0 tenant domain, e.g. `your-tenant.us.auth0.com` |
| `OAUTH_WORKOS_CLIENT_ID`, `OAUTH_WORKOS_API_KEY` | workos | Scaffold only — see `src/oauth/providers/workos.ts` |

## Authentication Modes

### API Key (default)

Two ways to authenticate, and you can mix them:

**Bring your own key** — any request can send `x-afriex-api-key` directly.
It's used as-is; there's no separate validation step, since a bad key just
fails naturally against the real Afriex API. This is the default pattern —
no server config needed beyond starting the server:

```bash
npx @afriex/mcp-server --http
# Clients send: x-afriex-api-key: sk_your_afriex_api_key
```

**Shared server key** — if you'd rather the server hold one key on behalf
of all callers (a private, single-tenant deployment), set `AFRIEX_API_KEY`
and gate it behind `x-api-key`:

```bash
export AFRIEX_API_KEY="sk_your_afriex_api_key"
npx @afriex/mcp-server --http
# Clients send: x-api-key: sk_your_afriex_api_key
```

`x-api-key` is only checked when a request doesn't bring its own
`x-afriex-api-key` — it exists purely to stop strangers from spending
*your* server's key, since a self-supplied key needs no such protection.

### Bearer Token

```bash
export AFRIEX_API_KEY="sk_your_afriex_api_key"
export AFRIEX_MCP_BEARER_TOKEN="your-bearer-token"
export AFRIEX_MCP_AUTH_MODE="bearer"
npx @afriex/mcp-server --http
# Clients send: Authorization: Bearer your-bearer-token
```

### OAuth 2.1 — custom provider (self-hosted, default)

No external identity provider needed. "Login" is a consent screen that takes
the caller's existing Afriex API key, confirms it against the real Afriex
API, and issues tokens bound to it.

```bash
export OAUTH_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export OAUTH_AUDIENCE="https://mcp.afriex.com"   # this server's own public URL
npx @afriex/mcp-server --http --oauth
```

Flow: an MCP client registers via `POST /register` (RFC 7591 Dynamic Client
Registration, supported out of the box), sends the user to `GET /authorize`
with PKCE, the user pastes their Afriex API key into the consent page, and
the client exchanges the resulting code at `POST /token`. Signing keys and
all client/token state persist in the SQLite file at `OAUTH_DB_PATH` —
back that path with a persistent volume if you deploy in a container.

The Afriex API key is never embedded in a token in the clear — access
tokens carry it as AES-256-GCM ciphertext (`OAUTH_ENCRYPTION_KEY`), readable
only by this server. See `src/oauth/providers/custom.ts` for the full flow.

**What this looks like for an actual end user:** all of DCR, building the
`/authorize` URL with PKCE, and exchanging the code for tokens is done by
the MCP client (Claude.ai's remote connector, Claude Desktop, etc.), not by
a human. The only part a person sees is the consent page — click "Connect,"
a browser tab opens, paste your Afriex API key, click Authorize, done. The
client handles the rest invisibly and reconnects silently using the refresh
token from then on. Manually registering a client and constructing PKCE
parameters by hand (see below) is only for testing this server without a
real MCP client in the loop.

### OAuth 2.1 — Auth0 or WorkOS

For an external, already-hosted authorization server instead of running
your own:

```bash
export OAUTH_PROVIDER="auth0"
export OAUTH_AUTH0_DOMAIN="your-tenant.us.auth0.com"
export OAUTH_AUDIENCE="https://api.afriex.com"   # the API identifier configured in Auth0
npx @afriex/mcp-server --http --oauth
```

With this provider, MCP clients talk to Auth0 directly for `/authorize`,
`/token`, and Dynamic Client Registration (Auth0 supports OIDC DCR at
`/oidc/register` natively) — this server only validates the resulting JWTs.
`OAUTH_PROVIDER=workos` follows the same shape but is a scaffold, not a
finished integration; see `src/oauth/providers/workos.ts` for what's left.

One thing external providers can't do automatically: this server expects
the validated JWT to carry the Afriex API key as an encrypted `afx_key`
claim (same `OAUTH_ENCRYPTION_KEY` scheme as the custom provider) so it
knows which tenant is calling. For Auth0 that means adding a Login Action
that looks up the user's Afriex key and injects it as a custom claim — see
the comment block at the top of `src/oauth/providers/auth0.ts`. Without it,
tokens still validate, but tool calls fall back to this server's own static
`AFRIEX_API_KEY` — fine for a single-tenant OAuth-gated deployment, not for
multi-tenant.

The server serves OAuth 2.1 Protected Resource Metadata (RFC 9728) and
Authorization Server Metadata (RFC 8414) for MCP client auto-discovery
regardless of which provider is active.

## Multi-Tenant Deployments (bring-your-own-key)

This is the default behavior, not an opt-in flag: any `--http` deployment
can serve many tenants, each supplying their own key. `AFRIEX_API_KEY`
doesn't need to be set at all for a shared, public endpoint (e.g.
`https://mcp.afriex.com/mcp`):

```json
{
  "mcpServers": {
    "afriex": {
      "url": "https://mcp.afriex.com/mcp",
      "headers": {
        "x-afriex-api-key": "sk_your_afriex_api_key",
        "x-afriex-environment": "production"
      }
    }
  }
}
```

In `api-key` auth mode (the default), sending `x-afriex-api-key` also
satisfies the gate — see "Authentication Modes" above. In `bearer`/`oauth`
mode, that gate still applies first, and the header (or, in OAuth's case,
the key bound to the access token) determines which Afriex account the
call operates on. SDK instances are cached per (key, environment) pair so
repeated calls from the same tenant don't pay reconstruction cost.

## Client Configuration

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "afriex": {
      "command": "npx",
      "args": ["@afriex/mcp-server"],
      "env": {
        "AFRIEX_API_KEY": "sk_..."
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "afriex": {
      "command": "npx",
      "args": ["@afriex/mcp-server"],
      "env": {
        "AFRIEX_API_KEY": "sk_..."
      }
    }
  }
}
```

### Remote HTTP

```json
{
  "mcpServers": {
    "afriex": {
      "url": "http://your-server:3001/mcp",
      "headers": {
        "x-afriex-api-key": "sk_your_afriex_api_key"
      }
    }
  }
}
```

Use `x-api-key` instead only if this deployment holds one shared
`AFRIEX_API_KEY` on the server side and you're relying on that (see
"Authentication Modes").

## Deployment

The HTTP transport is a plain Express app (`src/transport/http.ts`) — deploy
it like any Node HTTP service, behind a reverse proxy with TLS for a real
domain (e.g. `https://mcp.afriex.com`).

### Container / VM (recommended once OAuth is enabled)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js", "--http", "--oauth", "--port=3001"]
```

With the `custom` OAuth provider, mount a persistent volume for
`OAUTH_DB_PATH` — it holds registered clients, refresh tokens, and the
signing key, and losing it invalidates every issued token and forces
clients to re-register.

### Vercel / Cloudflare Workers

The Streamable HTTP transport itself works fine on serverless platforms in
`api-key`/`bearer` mode, or `oauth` mode with an external provider
(Auth0/WorkOS) that doesn't need local storage. It's a poor fit for the
`custom` OAuth provider specifically, since SQLite needs a persistent disk
that most serverless platforms don't give you across invocations — use a
container instead, or point `OAUTH_PROVIDER` at Auth0/WorkOS.

## Development

```bash
# From the monorepo root
pnpm install
pnpm --filter @afriex/mcp-server build

# Run in dev mode
AFRIEX_API_KEY=sk_test_xxx pnpm --filter @afriex/mcp-server start

# Run HTTP mode
AFRIEX_API_KEY=sk_test_xxx pnpm --filter @afriex/mcp-server start -- --http
```

## Related

- [Afriex SDK](https://docs.afriex.com/sdk/introduction) — TypeScript SDK used internally
- [Afriex API Docs](https://docs.afriex.com) — Full API reference
- [MCP Specification](https://modelcontextprotocol.io) — Model Context Protocol

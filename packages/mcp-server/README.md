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

The server exposes 20+ tools covering every Afriex API endpoint:

| Tool | Description |
|------|-------------|
| `afriex_get_balance` | Get wallet balances for one or more currencies |
| `afriex_top_up_sandbox` | Credit wallet with test funds (sandbox only) |
| `afriex_create_customer` | Create a new customer |
| `afriex_get_customer` | Get customer by ID |
| `afriex_list_customers` | List customers with pagination |
| `afriex_update_customer_kyc` | Update customer KYC information |
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
| `AFRIEX_API_KEY` | Yes | — | Your Afriex API key. Also doubles as the MCP client credential in `api-key` mode (sent as `x-api-key`) |
| `AFRIEX_ENVIRONMENT` | No | `production` | `staging` or `production` |
| `AFRIEX_MCP_AUTH_MODE` | No | `api-key` | Auth mode: `api-key`, `bearer`, or `oauth` |
| `AFRIEX_MCP_BEARER_TOKEN` | See below | — | Bearer token for MCP clients (required in `bearer` mode) |
| `AFRIEX_WEBHOOK_PUBLIC_KEY` | No | — | Public key for webhook signature verification |
| `AFRIEX_LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, or `error` |
| `PORT` | No | `3001` | HTTP server port |
| `HOST` | No | `0.0.0.0` | HTTP server host |

### OAuth Configuration

When using `--oauth` mode, set these variables for your OAuth provider:

| Variable | Description |
|----------|-------------|
| `OAUTH_ISSUER_URL` | OAuth issuer URL (e.g. `https://your-tenant.auth0.com`) |
| `OAUTH_JWKS_URL` | JWKS URL for token validation (defaults to `{issuer}/.well-known/jwks.json`) |
| `OAUTH_AUDIENCE` | Expected audience claim in the access token |
| `OAUTH_CLIENT_ID` | OAuth client ID |
| `OAUTH_CLIENT_SECRET` | OAuth client secret |

## Authentication Modes

### API Key (default for stdio)

```bash
export AFRIEX_API_KEY="sk_your_afriex_api_key"
npx @afriex/mcp-server --http
# Clients send: x-api-key: sk_your_afriex_api_key
```

### Bearer Token

```bash
export AFRIEX_API_KEY="sk_your_afriex_api_key"
export AFRIEX_MCP_BEARER_TOKEN="your-bearer-token"
export AFRIEX_MCP_AUTH_MODE="bearer"
npx @afriex/mcp-server --http
# Clients send: Authorization: Bearer your-bearer-token
```

### OAuth 2.1

```bash
export AFRIEX_API_KEY="sk_your_afriex_api_key"
export OAUTH_ISSUER_URL="https://your-tenant.auth0.com/"
export OAUTH_AUDIENCE="https://api.afriex.com"
npx @afriex/mcp-server --http --oauth
```

The server serves OAuth 2.1 Protected Resource Metadata (RFC 9728) and
Authorization Server Metadata (RFC 8414) for MCP client auto-discovery.

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
        "x-api-key": "sk_your_afriex_api_key"
      }
    }
  }
}
```

## Deployment

### Vercel / Cloudflare Workers

The HTTP transport uses Streamable HTTP which works with serverless platforms.
For Vercel, deploy the Express handler as a serverless function.

### Docker

```dockerfile
FROM node:22-alpine
RUN npx @afriex/mcp-server --http --port=3001
EXPOSE 3001
```

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

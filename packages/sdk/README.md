# @afriex/sdk

Official TypeScript SDK for the Afriex Business API. A unified interface for all Afriex services.

## Installation

```bash
npm install @afriex/sdk
# or
pnpm add @afriex/sdk
```

## Quick Start

```typescript
import { AfriexSDK } from "@afriex/sdk";
// or use the alias
import { Afriex } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: "your-api-key",
  environment: "production", // or 'staging' (default: 'production')
  webhookPublicKey: "-----BEGIN PUBLIC KEY-----...", // optional
});

// Customers
const customer = await afriex.customers.create({
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  countryCode: "US",
});

// Payment Methods
const paymentMethod = await afriex.paymentMethods.create({
  customerId: customer.customerId,
  channel: "BANK_ACCOUNT",
  accountName: "John Doe",
  accountNumber: "1234567890",
  countryCode: "NG",
  institution: {
    institutionCode: "058",
    institutionName: "GTBank",
  },
});

// Transactions
const transaction = await afriex.transactions.create({
  customerId: customer.customerId,
  sourceAmount: "100",
  destinationAmount: "50000",
  sourceCurrency: "USD",
  destinationCurrency: "NGN",
  destinationId: paymentMethod.paymentMethodId,
  meta: {
    idempotencyKey: "quick-start-transaction-1",
    reference: "order-123",
  },
});

// Rates
const rate = await afriex.rates.getRate("USD", "NGN");

// Balance
const balances = await afriex.balance.getBalance({
  currencies: ["USD", "NGN"],
});

// Checkout - hosted payment page
const session = await afriex.checkout.createSession({
  amount: 10000, // minor units, minimum 100
  currency: "USD",
  merchantReference: "order-123",
  redirectUrl: "https://example.com/checkout/complete",
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"],
  customer: {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    countryCode: "US",
  },
});
// session.checkoutUrl, session.channels

// Webhook verification (requires webhookPublicKey)
const isValid = afriex.webhooks.verify(payload, signature);
```

## Available Services

| Service                 | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `afriex.customers`      | Customer CRUD, KYC updates, and document verification       |
| `afriex.transactions`   | Create, authorize, list, and track transactions             |
| `afriex.paymentMethods` | Bank, mobile money, crypto wallets, virtual & pool accounts |
| `afriex.paymentBatches` | Pay many recipients in one call                             |
| `afriex.balance`        | Organization wallet balances and sandbox top-ups            |
| `afriex.rates`          | Exchange rates and conversions                              |
| `afriex.checkout`       | Hosted checkout sessions (card, virtual account, momo)      |
| `afriex.media`          | Upload invoices, payment proofs and documents               |
| `afriex.smeRegistration` | Register the business for dedicated KES virtual accounts   |
| `afriex.webhooks`       | Webhook signature verification and sandbox test triggers    |

Every service is always available on the client. `afriex.webhooks.verify()` returns `false`
unless a `webhookPublicKey` was provided; `afriex.webhookVerifier` is set only when one was.

## Configuration

```typescript
interface AfriexSDKConfig {
  apiKey: string; // Required - Your Afriex API key
  environment?: "staging" | "production"; // Default: 'production'
  webhookPublicKey?: string; // Optional - Afriex's PEM public key for webhook verification
  customConfig?: { timeout?: number }; // Optional - override timeout
  logLevel?: LogLevel; // Default: LogLevel.ERROR
  enableLogging?: boolean; // Default: true
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryableStatusCodes: number[]; // Default: [408, 429, 500, 502, 503, 504]
    retryableMethods?: HttpMethod[]; // Default: every method except POST and PATCH
  };
  apiVersion?: string; // Default: '2026-05-18', sent as x-api-version
  signRequest?: RequestSigner; // Optional - returns the x-api-signature value
}
```

Retries are off by default. When they are on, `POST` and `PATCH` requests are
still sent once unless `retryableMethods` lists them. See
[`@afriex/core`](https://www.npmjs.com/package/@afriex/core) for retries and
request signing.

`staging` points at `https://sandbox.api.afriex.com/api/v1`, `production` at
`https://api.afriex.com/api/v1`.

## Error Handling

All errors extend `AfriexError` and are re-exported from this package:

```typescript
import { AfriexError, ApiError, ValidationError, RateLimitError, NetworkError } from "@afriex/sdk";

try {
  await afriex.transactions.create(request);
} catch (error) {
  if (error instanceof ValidationError) {
    // Request failed local validation before being sent
  } else if (error instanceof RateLimitError) {
    // 429 - back off and retry
  } else if (error instanceof ApiError) {
    // Non-2xx response from the API
  } else if (error instanceof NetworkError) {
    // Connection/timeout failure
  }
}
```

## Individual Packages

For smaller bundle sizes, install packages individually:

| Package                   | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `@afriex/core`            | Base client, config, HTTP layer, errors, shared types  |
| `@afriex/customers`       | Customer management and KYC                            |
| `@afriex/transactions`    | Transaction handling                                   |
| `@afriex/payment-methods` | Payment methods, institutions, virtual & pool accounts |
| `@afriex/payment-batches` | Bulk payouts to a saved list of recipients             |
| `@afriex/balance`         | Balance queries and sandbox top-ups                    |
| `@afriex/rates`           | Exchange rates and conversions                         |
| `@afriex/checkout`        | Hosted checkout sessions                               |
| `@afriex/media`           | File uploads                                           |
| `@afriex/sme-registration` | SME registration for KES virtual accounts             |
| `@afriex/webhooks`        | Webhook verification and test triggers                 |

Each service package depends only on `@afriex/core`, so you can mix and match.

## AI agents

Every `@afriex/*` package ships [TanStack Intent](https://tanstack.com/intent) skills under
`skills/`, so coding agents get grounded guidance on this SDK instead of guessing at the API.
If you use an AI agent, run:

```bash
npx @tanstack/intent@latest install
```

List what is available with `npx @tanstack/intent@latest list`.

## Documentation

Full documentation available at [docs.afriex.com](https://docs.afriex.com/sdk/introduction)

## License

MIT

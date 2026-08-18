---
name: afriex-sdk
description: >
  Entry point for the Afriex Business API TypeScript SDK (@afriex/sdk) — the
  AfriexSDK / Afriex facade and its customers, transactions, paymentMethods,
  balance, rates, checkout, and webhooks services. Covers installation,
  AfriexSDKConfig including webhookPublicKey, choosing sandbox vs production,
  the end-to-end customer → payment method → transaction → webhook payout flow,
  and which sub-skill covers each service. Load when starting an Afriex
  integration, sending or collecting cross-border payments in TypeScript, or
  deciding which Afriex service to call.
metadata:
  type: core
  library: '@afriex/sdk'
  library_version: '3.0.1'
sources:
  - 'Afri-exchange/afriex-sdk:packages/sdk/src/index.ts'
  - 'Afri-exchange/afriex-sdk:packages/core/src/config/Config.ts'
  - 'Afri-exchange/afriex-sdk:README.md'
---

# Afriex SDK

`@afriex/sdk` is the umbrella package for the Afriex Business API. `AfriexSDK`
extends `AfriexClient` from `@afriex/core` and constructs every service against
one shared `HttpClient`, so a single instance carries the API key, environment,
retry policy, and logging for the whole integration. Individual services also
ship as standalone `@afriex/*` packages when only part of the surface is
needed.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

export const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment:
    process.env.NODE_ENV === "production"
      ? Environment.PRODUCTION
      : Environment.STAGING,
  webhookPublicKey: process.env.AFRIEX_WEBHOOK_PUBLIC_KEY,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
});
```

Install with `npm install @afriex/sdk`. Create one instance at module scope and
import it where needed — each construction builds a fresh HTTP client.

## Services

| Need to...                                        | Use                     | Skill                             |
| ------------------------------------------------- | ----------------------- | --------------------------------- |
| Register senders and recipients, submit KYC       | `afriex.customers`         | `afriex-customers`                |
| Add bank, mobile money, or virtual account rails  | `afriex.paymentMethods`    | `afriex-payment-methods`          |
| Send payouts, collect deposits, swap currencies   | `afriex.transactions`      | `afriex-transactions`             |
| Read wallet balances, fund a sandbox wallet       | `afriex.balance`           | `afriex-balance`                  |
| Quote exchange rates                              | `afriex.rates`             | `afriex-rates`                    |
| Host a payment page                               | `afriex.checkout`          | `afriex-checkout`                 |
| Verify inbound events, replay test events         | `afriex.webhooks`          | `afriex-webhooks`                 |
| Configure transport, errors, retries              | `AfriexClient`, errors  | `afriex-core`                     |
| Ship to production safely                         | —                       | `afriex-go-live`                  |

## Core Patterns

### End-to-end payout

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const customer = await afriex.customers.create({
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+2348012345678",
  countryCode: "NG",
});

const { data: institutions } = await afriex.paymentMethods.getInstitutions({
  channel: "BANK_ACCOUNT",
  countryCode: "NG",
});

const destination = await afriex.paymentMethods.create({
  channel: "BANK_ACCOUNT",
  customerId: customer.customerId,
  accountName: customer.name,
  accountNumber: "0123456789",
  countryCode: "NG",
  institution: {
    institutionCode: institutions[0].institutionCode,
    institutionName: institutions[0].institutionName,
  },
});

const transaction = await afriex.transactions.create({
  customerId: customer.customerId,
  destinationId: destination.paymentMethodId,
  sourceAmount: "100.00",
  sourceCurrency: "USD",
  destinationAmount: "150000.00",
  destinationCurrency: "NGN",
  meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
});

console.log(transaction.transactionId, transaction.status);
```

The transaction resolves as `PENDING` or `PROCESSING`; settlement arrives as a
`TRANSACTION.UPDATED` webhook.

### Import only the services you use

```ts
import { AfriexClient, Environment } from "@afriex/core";
import { RateService } from "@afriex/rates";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const rates = new RateService(client.getHttpClient());
console.log(await rates.getRate("USD", "NGN"));
```

Every service takes the `HttpClient` returned by `client.getHttpClient()`.

### Handle errors once, at the edge

```ts
import { AfriexSDK, ApiError, RateLimitError, ValidationError } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export async function safeGetTransaction(id: string) {
  try {
    return await afriex.transactions.get(id);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new Error(`rate limited, retry after ${error.retryAfter ?? 1}s`);
    }
    if (error instanceof ValidationError) {
      throw new Error(`bad request: ${JSON.stringify(error.fields)}`);
    }
    if (error instanceof ApiError) {
      throw new Error(`afriex ${error.statusCode} ${error.errorCode}`);
    }
    throw error;
  }
}
```

`@afriex/sdk` re-exports everything from `@afriex/core`, so error classes and
`Environment` come from the same import.

## Common Mistakes

### HIGH Calling afriex.webhookVerifier without configuring a public key

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export function handle(rawBody: string, signature: string) {
  return afriex.webhookVerifier!.verifyAndParse(rawBody, signature);
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  webhookPublicKey: process.env.AFRIEX_WEBHOOK_PUBLIC_KEY!,
});

export function handle(rawBody: string, signature: string) {
  return afriex.webhooks.verifyAndParse(rawBody, signature);
}
```

`webhookVerifier` is assigned only when `webhookPublicKey` is present, so the
non-null assertion throws `Cannot read properties of undefined` at the first
delivery; `afriex.webhooks` always exists and is the same object when the key is
configured.

Source: packages/sdk/src/index.ts (`if (config.webhookPublicKey) this.webhookVerifier = this.webhooks`)

### HIGH Constructing a new AfriexSDK per request

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

export async function getBalances() {
  const afriex = new AfriexSDK({
    apiKey: process.env.AFRIEX_API_KEY!,
    environment: Environment.PRODUCTION,
  });
  return afriex.balance.getBalance();
}
```

Correct:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
});

export async function getBalances() {
  return afriex.balance.getBalance();
}
```

Each `AfriexSDK` builds a fresh `ky` instance and seven service objects, so
per-request construction discards connection reuse and multiplies allocation
under load.

Source: packages/sdk/src/index.ts (constructor)

### MEDIUM Omitting environment and defaulting to production

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });
```

Correct:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment:
    process.env.NODE_ENV === "production"
      ? Environment.PRODUCTION
      : Environment.STAGING,
});
```

`Config` defaults `environment` to `Environment.PRODUCTION`, so an integration
test written without the field points at the live API and moves real money.

Source: packages/core/src/config/Config.ts (environment default)

See also: afriex-go-live/SKILL.md — the pre-deploy checklist for this
configuration.

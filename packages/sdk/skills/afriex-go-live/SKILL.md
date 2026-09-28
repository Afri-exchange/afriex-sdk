---
name: afriex-go-live
description: >
  Pre-deploy security and correctness checklist for an Afriex Business API
  integration built on @afriex/afriex. Verifies API key handling, Environment
  selection, retry and timeout policy, transaction idempotency keys, webhook
  signature verification against webhookPublicKey with raw bodies, at-least-once
  delivery handling, sandbox-only endpoints, and error-code handling. Load
  before shipping an Afriex integration to production, during a payments
  security review, or when auditing an existing Afriex integration.
metadata:
  type: security
  library: '@afriex/sdk'
  library_version: '4.1.0'
requires:
  - 'afriex-sdk'
sources:
  - 'Afri-exchange/afriex-sdk:packages/sdk/src/index.ts'
  - 'Afri-exchange/afriex-sdk:packages/core/src/config/Config.ts'
  - 'Afri-exchange/afriex-sdk:packages/webhooks/src/WebhookService.ts'
  - 'Afri-exchange/afriex-sdk:packages/transactions/src/TransactionService.ts'
---

# Afriex SDK — Go-Live Checklist

Run through each section before pointing an integration at
`Environment.PRODUCTION`. This skill builds on `afriex-sdk`; read it first for
the configuration surface these checks refer to.

## Credential Checks

### Check: the API key comes from the environment, never source

Expected:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const apiKey = process.env.AFRIEX_API_KEY;
if (!apiKey) {
  throw new Error("AFRIEX_API_KEY is not set");
}

export const afriex = new AfriexSDK({ apiKey, environment: Environment.PRODUCTION });
```

Fail condition: an `apiKey` string literal, a key in a committed `.env`, or a
key reaching client-side bundles.
Fix: move the key to a server-side secret store and rotate the exposed one.

### Check: production and sandbox keys are distinct variables

Expected:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const isProduction = process.env.NODE_ENV === "production";

export const afriex = new AfriexSDK({
  apiKey: (isProduction ? process.env.AFRIEX_API_KEY : process.env.AFRIEX_SANDBOX_API_KEY)!,
  environment: isProduction ? Environment.PRODUCTION : Environment.STAGING,
});
```

Fail condition: one `AFRIEX_API_KEY` variable reused across environments, or
`environment` omitted entirely.
Fix: separate the variables — `Config` defaults `environment` to
`Environment.PRODUCTION`, so an omitted field silently targets live money.

## Transport Checks

### Check: retries are explicitly configured

Expected:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

export const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
});
```

Fail condition: no `retryConfig` — `DEFAULT_CONFIG` sets `maxRetries: 0`, so a
single 503 fails the request outright.
Fix: supply `retryConfig`.

### Check: writes are not retried blindly

Expected: `retryConfig.retryableMethods` is absent, or lists neither `POST`
nor `PATCH`.

With the default methods, the SDK retries reads and sends every `POST` and
`PATCH` once. A write that fails with a 5xx or a timeout may still have been
applied, so the application reads the state back (for a transaction,
`transactions.list({ reference })`) before it sends the write again, and
reuses the same `meta.idempotencyKey` when it does.

Fail condition: `retryableMethods` includes `POST` on a client that calls
`paymentBatches.withdraw` — a repeat starts a second run and pays every
recipient again.
Fix: remove `POST` from `retryableMethods` and retry writes in application
code, where the state can be checked first.

### Check: request logging does not leak request bodies

Expected:

```ts
import { AfriexSDK, Environment, LogLevel } from "@afriex/sdk";

export const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
  enableLogging: true,
  logLevel: LogLevel.ERROR,
});
```

Fail condition: `logLevel: LogLevel.DEBUG` in production, which logs request
and response metadata for every call.
Fix: keep production at `LogLevel.ERROR` and scrub customer data from any
handler that serializes `ApiError.details`.

## Money-Movement Checks

### Check: every transaction carries a stable idempotency key

Expected:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export async function payout(orderId: string, idempotencyKey: string) {
  return afriex.transactions.create({
    customerId: "cus_123",
    destinationId: "pm_456",
    sourceAmount: "100.00",
    sourceCurrency: "USD",
    destinationAmount: "150000.00",
    destinationCurrency: "NGN",
    meta: { idempotencyKey, reference: orderId },
  });
}

export const keyForOrder = (orderId: string) => `${orderId}:${randomUUID()}`;
```

Fail condition: `idempotencyKey: randomUUID()` generated inside a retry loop or
inside the request handler, so each attempt is a new key.
Fix: persist the key with the order before the first attempt and reuse it for
every retry.

### Check: settlement is driven by webhooks, not by create() resolving

Expected:

```ts
import type { TransactionWebhookPayload } from "@afriex/sdk";

const TERMINAL = new Set(["SUCCESS", "FAILED", "CANCELLED", "REJECTED", "REFUNDED"]);

export function isSettled(event: TransactionWebhookPayload): boolean {
  return TERMINAL.has(event.data.status);
}
```

Fail condition: order state marked paid immediately after
`transactions.create()` resolves.
Fix: treat `PENDING` and `PROCESSING` as in-flight and settle on
`TRANSACTION.UPDATED`.

### Check: no sandbox-only calls run in production

Expected:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

export async function seedTestWallet(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  await afriex.balance.topUpSandbox({ amount: 10000, currency: "USD" });
  await afriex.webhooks.triggerTestWebhook({
    event: "TRANSACTION.UPDATED",
    entityId: "507f1f77bcf86cd799439011",
  });
}
```

Fail condition: `balance.topUpSandbox`, `webhooks.triggerTestWebhook`,
`transactions.simulate` or `paymentMethods.simulateTransfer` reachable on a
production code path — all four answer `403 FORBIDDEN` there.
Fix: guard them behind an environment check or keep them in test-only modules.

### Check: no sandbox test value reaches production

Expected:

```ts
const SANDBOX_OUTCOME_SUFFIXES = ["0001", "0002", "0003", "0004", "0005"];

export function assertRealAccount(accountNumber: string): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (SANDBOX_OUTCOME_SUFFIXES.some((suffix) => accountNumber.endsWith(suffix))) {
    console.warn("account number matches a sandbox test value", accountNumber);
  }
}
```

In the sandbox, an account number, phone number or card number ending in
`0001` to `0005` chooses the outcome of a transaction, the OTP is always
`123456`, and `SIMULATE_INSTANT` in `meta.reference` completes a transaction
early. None of this applies in production, where those are ordinary values.

Fail condition: a fixture account, the OTP `123456` or a `SIMULATE_INSTANT`
reference hard-coded on a path that runs in production.
Fix: keep test values in fixtures that only the test environment loads.

## Webhook Checks

### Check: the firewall admits Afriex's webhook addresses

Expected: inbound traffic to the webhook endpoint is allowed from
`34.197.33.100` in production and `34.234.189.210` in the sandbox.

Fail condition: a firewall or allowlist in front of the endpoint that does not
include the address for the environment — deliveries are dropped before they
reach the handler, and nothing is logged on the application side.
Fix: add the address to the allowlist. The address is not a substitute for
verifying the signature.

### Check: the endpoint verifies signatures against the raw body

Expected:

```ts
import express from "express";
import { AfriexSDK, WEBHOOK_SIGNATURE_HEADER } from "@afriex/sdk";

const webhookPublicKey = process.env.AFRIEX_WEBHOOK_PUBLIC_KEY;
if (!webhookPublicKey) {
  throw new Error("AFRIEX_WEBHOOK_PUBLIC_KEY is not set");
}

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY!, webhookPublicKey });
const app = express();

app.post(
  "/webhooks/afriex",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const event = afriex.webhooks.verifyAndParse(
        req.body.toString("utf8"),
        req.header(WEBHOOK_SIGNATURE_HEADER) ?? ""
      );
      console.log(event.event);
      res.sendStatus(200);
    } catch {
      res.sendStatus(400);
    }
  }
);
```

Fail condition: `express.json()` applied to the webhook route, or
`JSON.stringify(req.body)` passed to `verify`.
Fix: mount `express.raw` on the webhook path and verify the exact bytes.

### Check: a missing public key fails closed

Expected:

```ts
import { AfriexSDK } from "@afriex/sdk";

const webhookPublicKey = process.env.AFRIEX_WEBHOOK_PUBLIC_KEY;
if (!webhookPublicKey) {
  throw new Error("AFRIEX_WEBHOOK_PUBLIC_KEY is not set");
}

export const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  webhookPublicKey,
});
```

Fail condition: the handler logs a warning and processes the payload when
`verify` returns `false`.
Fix: assert the key at boot and use `verifyAndParse`, which throws on a missing
key instead of returning `false`.

### Check: handlers are idempotent across redeliveries

Expected:

```ts
import type { TransactionWebhookPayload } from "@afriex/sdk";

export async function onTransaction(
  event: TransactionWebhookPayload,
  seen: { has(key: string): Promise<boolean>; add(key: string): Promise<void> }
): Promise<void> {
  const key = `${event.data.transactionId}:${event.data.status}`;
  if (await seen.has(key)) {
    return;
  }
  await seen.add(key);
  console.log("processing", key);
}
```

Fail condition: side effects run on every delivery with no deduplication key.
Fix: deduplicate on `transactionId` plus `status` in durable storage.

## Common Security Mistakes

### HIGH Returning ApiError.message to end users as an error code

Wrong:

```ts
import { ApiError } from "@afriex/sdk";

export function toClientError(error: unknown): { code: string } {
  return { code: error instanceof ApiError ? error.message : "UNKNOWN" };
}
```

Correct:

```ts
import { ApiError, AfriexErrorCode } from "@afriex/sdk";

export function toClientError(error: unknown): { code: string; message: string } {
  if (error instanceof ApiError) {
    return {
      code: error.errorCode ?? AfriexErrorCode.UNKNOWN_ERROR,
      message: error.details?.friendlyMessage ?? "Payment could not be completed",
    };
  }
  return { code: AfriexErrorCode.UNKNOWN_ERROR, message: "Payment could not be completed" };
}
```

`ApiError.message` falls back through `friendlyMessage`, `errorMessage`, and
`error`, so it can surface internal technical detail as a client-facing code
and it changes without a version bump.

Source: packages/core/src/errors/ApiError.ts

## Pre-Deploy Summary

- [ ] API key read from a secret store; no key in source or client bundles
- [ ] Separate sandbox and production keys; `environment` set explicitly
- [ ] `retryConfig` configured — retries are off by default
- [ ] `retryableMethods` does not include `POST` or `PATCH`
- [ ] Afriex's webhook IP address is allowed through the firewall
- [ ] `logLevel` is `LogLevel.ERROR` in production
- [ ] Every `transactions.create` carries a persisted, reused `meta.idempotencyKey`
- [ ] Order state settles on `TRANSACTION.UPDATED`, not on `create()` resolving
- [ ] `topUpSandbox`, `triggerTestWebhook`, `simulate` and `simulateTransfer` are unreachable in production
- [ ] No sandbox test account, OTP or `SIMULATE_INSTANT` reference on a production path
- [ ] Webhook route uses a raw body parser and `verifyAndParse`
- [ ] `AFRIEX_WEBHOOK_PUBLIC_KEY` asserted at boot
- [ ] Webhook handlers deduplicate on `transactionId` plus `status`
- [ ] Client-facing errors use `errorCode`, not `ApiError.message`

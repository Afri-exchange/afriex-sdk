---
name: afriex-webhooks
description: >
  Receive and verify Afriex webhooks with @afriex/webhooks WebhookService —
  verify, verifyAndParse, and triggerTestWebhook, plus the WebhookVerifier
  wrapper. Covers RSA-SHA256 base64 signatures in the x-webhook-signature
  header (WEBHOOK_SIGNATURE_HEADER), raw-body verification, the
  CUSTOMER/PAYMENT_METHOD/TRANSACTION/CHECKOUT_SESSION event union and payload
  shapes, and entityId vs the deprecated resourceId. Load when building a
  webhook endpoint, validating a signature, or replaying test events in
  sandbox.
metadata:
  type: core
  library: '@afriex/webhooks'
  library_version: '2.0.0'
sources:
  - 'Afri-exchange/afriex-sdk:packages/webhooks/src/WebhookService.ts'
  - 'Afri-exchange/afriex-sdk:packages/webhooks/src/WebhookVerifier.ts'
  - 'Afri-exchange/afriex-sdk:packages/webhooks/src/types.ts'
---

# Afriex Webhooks

Afriex signs every webhook body with its private key and sends the base64
signature in the `x-webhook-signature` header. `WebhookService` verifies that
signature against the Afriex public key with RSA-SHA256, and — when constructed
with an `HttpClient` — can replay test events in the sandbox.

## Setup

```ts
import express from "express";
import { AfriexSDK, Environment, WEBHOOK_SIGNATURE_HEADER } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
  webhookPublicKey: process.env.AFRIEX_WEBHOOK_PUBLIC_KEY!,
});

const app = express();

app.post(
  "/webhooks/afriex",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.header(WEBHOOK_SIGNATURE_HEADER) ?? "";

    try {
      const event = afriex.webhooks.verifyAndParse(req.body.toString("utf8"), signature);
      console.log(event.event, event.data);
      res.sendStatus(200);
    } catch {
      res.sendStatus(400);
    }
  }
);

app.listen(3000);
```

`webhookPublicKey` is the PEM-encoded Afriex public key. `verifyAndParse`
throws when it is absent or the signature does not match.

## Core Patterns

### Narrow the payload by event

```ts
import type { WebhookPayload } from "@afriex/sdk";

function handle(event: WebhookPayload): void {
  switch (event.event) {
    case "TRANSACTION.UPDATED":
      console.log(event.data.transactionId, event.data.status);
      break;
    case "CUSTOMER.CREATED":
      console.log(event.data.customerId, event.data.email);
      break;
    case "PAYMENT_METHOD.CREATED":
      console.log(event.data.paymentMethodId, event.data.channel);
      break;
    case "CHECKOUT_SESSION.CREATED":
      console.log(event.data);
      break;
    default:
      console.log("unhandled event", event.event);
  }
}
```

`WebhookPayload` is a discriminated union on `event`, so each branch narrows
`data` to the matching shape.

### Act only on terminal transaction states

```ts
import type { TransactionWebhookPayload } from "@afriex/sdk";

const TERMINAL = new Set(["SUCCESS", "FAILED", "CANCELLED", "REJECTED", "REFUNDED"]);

async function onTransaction(event: TransactionWebhookPayload): Promise<void> {
  if (!TERMINAL.has(event.data.status)) {
    return;
  }
  await settleOrder(event.data.merchantReference ?? "", event.data.status);
}

async function settleOrder(reference: string, status: string): Promise<void> {
  console.log(reference, status);
}
```

### Verify without the full SDK

```ts
import { WebhookVerifier, WEBHOOK_SIGNATURE_HEADER } from "@afriex/webhooks";

const verifier = new WebhookVerifier(process.env.AFRIEX_WEBHOOK_PUBLIC_KEY!);

export function parseWebhook(rawBody: string, headers: Record<string, string>) {
  return verifier.verifyAndParse(rawBody, headers[WEBHOOK_SIGNATURE_HEADER] ?? "");
}
```

`WebhookVerifier` takes only the public key and throws at construction if it is
missing — useful in a webhook worker that holds no API key.

### Replay a test event in sandbox

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.webhooks.triggerTestWebhook({
  event: "TRANSACTION.UPDATED",
  entityId: "507f1f77bcf86cd799439011",
});
```

`entityId` is the 24-character hex id of the customer, payment method, or
transaction — or a UUID v4 for `CHECKOUT_SESSION.CREATED`.

## Common Mistakes

### CRITICAL Verifying a re-serialized request body

Wrong:

```ts
import express from "express";
import { AfriexSDK, WEBHOOK_SIGNATURE_HEADER } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  webhookPublicKey: process.env.AFRIEX_WEBHOOK_PUBLIC_KEY!,
});

const app = express();
app.use(express.json());

app.post("/webhooks/afriex", (req, res) => {
  const signature = req.header(WEBHOOK_SIGNATURE_HEADER) ?? "";
  if (!afriex.webhooks.verify(JSON.stringify(req.body), signature)) {
    res.sendStatus(400);
    return;
  }
  res.sendStatus(200);
});
```

Correct:

```ts
import express from "express";
import { AfriexSDK, WEBHOOK_SIGNATURE_HEADER } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  webhookPublicKey: process.env.AFRIEX_WEBHOOK_PUBLIC_KEY!,
});

const app = express();

app.post(
  "/webhooks/afriex",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.header(WEBHOOK_SIGNATURE_HEADER) ?? "";
    if (!afriex.webhooks.verify(req.body.toString("utf8"), signature)) {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
  }
);
```

The signature covers the exact bytes Afriex sent; `express.json()` parses and
`JSON.stringify` re-emits them with different key order, spacing, and number
formatting, so verification fails for every legitimate delivery and the
endpoint rejects all real traffic.

Source: packages/webhooks/src/WebhookService.ts (`verify`)

### CRITICAL Treating verify() === false as "verification not configured"

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export function handleWebhook(rawBody: string, signature: string): unknown {
  if (!afriex.webhooks.verify(rawBody, signature)) {
    console.warn("signature check skipped");
  }
  return JSON.parse(rawBody);
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const webhookPublicKey = process.env.AFRIEX_WEBHOOK_PUBLIC_KEY;
if (!webhookPublicKey) {
  throw new Error("AFRIEX_WEBHOOK_PUBLIC_KEY is not set");
}

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  webhookPublicKey,
});

export function handleWebhook(rawBody: string, signature: string): unknown {
  return afriex.webhooks.verifyAndParse(rawBody, signature);
}
```

`verify` returns `false` — never throws — when no public key was configured,
so an unset environment variable is indistinguishable from a forged signature;
warn-and-continue then processes unauthenticated payloads as real money
movements. `verifyAndParse` throws on a missing key, failing closed.

Source: packages/webhooks/src/WebhookService.ts (`verify` returns false when `publicKey` is unset)

### HIGH Reading the signature header with its original casing

Wrong:

```ts
import type { IncomingMessage } from "node:http";

function signatureOf(req: IncomingMessage): string {
  return (req.headers["X-Webhook-Signature"] as string) ?? "";
}
```

Correct:

```ts
import type { IncomingMessage } from "node:http";
import { WEBHOOK_SIGNATURE_HEADER } from "@afriex/webhooks";

function signatureOf(req: IncomingMessage): string {
  return (req.headers[WEBHOOK_SIGNATURE_HEADER] as string) ?? "";
}
```

Node lowercases every incoming header name in `req.headers`, so the
mixed-case lookup is `undefined`, the empty-string signature makes `verify`
return `false`, and every delivery is rejected as unsigned.

Source: packages/webhooks/src/types.ts (`WEBHOOK_SIGNATURE_HEADER`)

### HIGH Processing deliveries without an idempotency guard

Wrong:

```ts
import type { TransactionWebhookPayload } from "@afriex/sdk";

async function onTransaction(event: TransactionWebhookPayload): Promise<void> {
  await creditMerchant(event.data.transactionId, event.data.destinationAmount);
}

async function creditMerchant(id: string, amount: string): Promise<void> {
  console.log(id, amount);
}
```

Correct:

```ts
import type { TransactionWebhookPayload } from "@afriex/sdk";

const processed = new Set<string>();

async function onTransaction(event: TransactionWebhookPayload): Promise<void> {
  const key = `${event.data.transactionId}:${event.data.status}`;
  if (processed.has(key)) {
    return;
  }
  processed.add(key);
  await creditMerchant(event.data.transactionId, event.data.destinationAmount);
}

async function creditMerchant(id: string, amount: string): Promise<void> {
  console.log(id, amount);
}
```

Webhook delivery is at-least-once and `TRANSACTION.UPDATED` fires on each
status change, so an unguarded handler credits the merchant again on every
redelivery and on every intermediate transition. Use a durable store rather
than an in-process `Set` in production.

Source: packages/webhooks/src/types.ts (`TransactionEventType`)

### MEDIUM Sending resourceId to triggerTestWebhook

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.webhooks.triggerTestWebhook({
  event: "CUSTOMER.CREATED",
  resourceId: "507f1f77bcf86cd799439011",
});
```

Correct:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.webhooks.triggerTestWebhook({
  event: "CUSTOMER.CREATED",
  entityId: "507f1f77bcf86cd799439011",
});
```

`resourceId` is deprecated: it still works by being copied into `entityId`, but
it logs a deprecation warning and is scheduled for removal.

Source: packages/webhooks/src/WebhookService.ts (`triggerTestWebhook`)

See also: afriex-transactions/SKILL.md — `TRANSACTION.UPDATED` is the
settlement signal for a payout created there.

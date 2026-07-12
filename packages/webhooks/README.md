# @afriex/webhooks

Webhook utilities for the Afriex SDK. Handles both signature verification and sandbox test triggering. `WebhookVerifier` remains available as a compatibility wrapper for verification-only usage.

## Installation

```bash
npm install @afriex/webhooks
# or
pnpm add @afriex/webhooks
```

## Usage

```typescript
import { WebhookVerifier, WEBHOOK_SIGNATURE_HEADER } from "@afriex/webhooks";

const verifier = new WebhookVerifier(
  "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
);

// Verify a webhook signature
const isValid = verifier.verify(payload, signature);

// Verify and parse webhook payload (throws if invalid)
const event = verifier.verifyAndParse(payload, signature);
console.log("Event type:", event.event);
console.log("Event data:", event.data);
```

### Express.js Example

```typescript
import express from "express";
import { WebhookVerifier, WEBHOOK_SIGNATURE_HEADER } from "@afriex/webhooks";

const app = express();
const verifier = new WebhookVerifier(process.env.AFRIEX_WEBHOOK_PUBLIC_KEY!);

app.post(
  "/webhooks/afriex",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers[WEBHOOK_SIGNATURE_HEADER] as string;
    const payload = req.body.toString();

    try {
      const event = verifier.verifyAndParse(payload, signature);

      switch (event.event) {
        case "TRANSACTION.CREATED":
        case "TRANSACTION.UPDATED":
          // Handle transaction events
          break;
        case "CUSTOMER.CREATED":
        case "CUSTOMER.UPDATED":
        case "CUSTOMER.DELETED":
          // Handle customer events
          break;
        case "PAYMENT_METHOD.CREATED":
        case "PAYMENT_METHOD.UPDATED":
        case "PAYMENT_METHOD.DELETED":
          // Handle payment method events
          break;
        case "CHECKOUT_SESSION.CREATED":
          // Handle checkout session events
          break;
      }

      res.status(200).send("OK");
    } catch (error) {
      res.status(401).send("Invalid signature");
    }
  }
);
```

## Webhook Event Types

### Customer Events

- `CUSTOMER.CREATED`
- `CUSTOMER.UPDATED`
- `CUSTOMER.DELETED`

### Transaction Events

- `TRANSACTION.CREATED`
- `TRANSACTION.UPDATED`

The payload's `data` includes `merchantReference` (mirrors `meta.reference`) and `meta.reference`; `status` covers the full set of transaction statuses (`PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED`, `REFUNDED`, `RETRY`, `UNKNOWN`, `SCHEDULED`, `CUSTOMER_ACTION_REQUIRED`, `REJECTED`, `IN_REVIEW`, `DISPUTED`, `DISPUTE_RESOLVED`, `DISPUTE_WON`, `DISPUTE_LOST`, `DISPUTE_EVIDENCE_SUBMITTED`).

### Payment Method Events

- `PAYMENT_METHOD.CREATED`
- `PAYMENT_METHOD.UPDATED`
- `PAYMENT_METHOD.DELETED`

The payload's `data` includes the payment method's lifecycle `status` (`active`, `pending`, `deleted`, `expired`, `blocked`).

### Checkout Session Events

- `CHECKOUT_SESSION.CREATED`

## API Reference

### `verify(payload: string, signature: string): boolean`

Verify a webhook signature using RSA SHA256.

**Parameters:**

- `payload`: Raw webhook payload string
- `signature`: Base64-encoded signature from `x-webhook-signature` header

**Returns:** `boolean` - Whether signature is valid

### `verifyAndParse(payload: string, signature: string): WebhookPayload`

Verify signature and parse the webhook event.

**Throws:** `Error` if signature is invalid

**Returns:** Parsed `WebhookPayload` object with `event` and `data` properties

### `triggerTestWebhook(request: TriggerWebhookRequest): Promise<TriggerWebhookResponse>` _(Sandbox only)_

Fires a real signed webhook to the business's configured callback URL using a real entity as the payload. Only available in the sandbox/staging environment.

```typescript
const result = await afriex.webhooks.triggerTestWebhook({
  event: "TRANSACTION.UPDATED",
  entityId: "transaction-id",
});
```

**Parameters:**

- `event` (required): One of the [webhook event types](#webhook-event-types)
- `entityId` (required unless `resourceId` is supplied): The 24-character hex id of the relevant customer, payment method, or transaction — or a UUID v4 for `CHECKOUT_SESSION.CREATED`
- `resourceId` — **deprecated** alias for `entityId`. Still works (mapped to `entityId` before the request is sent) but logs a deprecation warning; use `entityId` instead.

## Constants

- `WEBHOOK_SIGNATURE_HEADER` - The header name: `'x-webhook-signature'`

## License

MIT

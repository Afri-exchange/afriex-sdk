# @afriex/webhooks

Webhook verification for the Afriex SDK. Verify webhook signatures using RSA public key.

## Installation

```bash
npm install @afriex/webhooks
# or
pnpm add @afriex/webhooks
```

## Usage

```typescript
import { WebhookVerifier, WEBHOOK_SIGNATURE_HEADER } from '@afriex/webhooks';

const verifier = new WebhookVerifier('-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----');

// Verify a webhook signature
const isValid = verifier.verify(payload, signature);

// Verify and parse webhook payload (throws if invalid)
const event = verifier.verifyAndParse(payload, signature);
console.log('Event type:', event.event);
console.log('Event data:', event.data);
```

### Express.js Example

```typescript
import express from 'express';
import { WebhookVerifier, WEBHOOK_SIGNATURE_HEADER } from '@afriex/webhooks';

const app = express();
const verifier = new WebhookVerifier(process.env.AFRIEX_WEBHOOK_PUBLIC_KEY!);

app.post('/webhooks/afriex', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers[WEBHOOK_SIGNATURE_HEADER] as string;
    const payload = req.body.toString();

    try {
        const event = verifier.verifyAndParse(payload, signature);
        
        switch (event.event) {
            case 'TRANSACTION.CREATED':
            case 'TRANSACTION.UPDATED':
                // Handle transaction events
                break;
            case 'customer.created':
            case 'customer.updated':
            case 'customer.deleted':
                // Handle customer events
                break;
            case 'PAYMENT_METHOD.CREATED':
            case 'PAYMENT_METHOD.UPDATED':
            case 'PAYMENT_METHOD.DELETED':
                // Handle payment method events
                break;
        }

        res.status(200).send('OK');
    } catch (error) {
        res.status(401).send('Invalid signature');
    }
});
```

## Webhook Event Types

### Customer Events
- `customer.created`
- `customer.updated`
- `customer.deleted`

### Transaction Events
- `TRANSACTION.CREATED`
- `TRANSACTION.UPDATED`

### Payment Method Events
- `PAYMENT_METHOD.CREATED`
- `PAYMENT_METHOD.UPDATED`
- `PAYMENT_METHOD.DELETED`

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

## Constants

- `WEBHOOK_SIGNATURE_HEADER` - The header name: `'x-webhook-signature'`

## License

MIT

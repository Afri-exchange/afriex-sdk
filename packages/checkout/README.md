# @afriex/checkout

Checkout service for the Afriex SDK. Provides hosted payment checkout sessions.

## Installation

```bash
npm install @afriex/checkout
# or
pnpm add @afriex/checkout
```

## Usage

```typescript
import { CheckoutService } from "@afriex/checkout";
import { HttpClient } from "@afriex/core";

const httpClient = new HttpClient(config);
const checkoutService = new CheckoutService(httpClient);

// Create a checkout session
const session = await checkoutService.createSession({
  customer: {
    fullName: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    countryCode: "US",
  },
  transaction: {
    sourceAmount: "100.00",
    sourceCurrency: "USD",
    destinationAmount: "100.00",
    destinationCurrency: "NGN",
    type: "WITHDRAW",
    destinationId: "pm_123",
    meta: {
      idempotencyKey: "unique-key",
      reference: "order-123",
    },
  },
  successUrl: "https://yourapp.com/success",
  cancelUrl: "https://yourapp.com/cancel",
  webhookUrl: "https://yourapp.com/webhooks",
});

// Redirect user to checkout URL
window.location.href = session.checkoutUrl;
```

## API

### `createSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSession>`

Creates a hosted checkout session where customers can complete payments.

**Parameters:**

- `request.customer` - Customer information (fullName, email, phone, countryCode)
- `request.transaction` - Transaction details (amounts, currencies, type, payment method IDs)
- `request.successUrl` - URL to redirect to after successful payment
- `request.cancelUrl` - URL to redirect to if payment is cancelled
- `request.webhookUrl` - Optional webhook URL for payment notifications

**Returns:**

- `CheckoutSession` - Contains checkoutId, checkoutUrl, and expiresAt

## License

MIT

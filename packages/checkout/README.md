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
  amount: 500000,
  currency: "NGN",
  merchantReference: "order-2026-05-12-001",
  redirectUrl: "https://yourapp.com/checkout/return",
  customer: {
    name: "John Doe",
    email: "john@example.com",
    phone: "+2348192837465",
    countryCode: "NG",
  },
  channels: ["VIRTUAL_BANK_ACCOUNT"],
  metadata: {
    orderId: "ord_123",
    cartId: "cart_456",
  },
});

// Redirect user to checkout URL
window.location.href = session.checkoutUrl;
```

`amount` is sent in minor units. For example, NGN 5,000.00 should be passed as `500000`.

## API

### `createSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSession>`

Creates a hosted checkout session where customers can complete payments.

**Parameters:**

- `request.amount` - Integer amount in minor currency units, minimum `100`
- `request.currency` - Uppercase 3-letter ISO 4217 currency code
- `request.merchantReference` - Unique reference used to identify the session end-to-end
- `request.redirectUrl` - HTTPS URL to return the customer to after checkout
- `request.customer` - Customer information (`name`, `email`, `phone`, `countryCode`)
- `request.channels` - Optional allowed payment channels. Defaults to `VIRTUAL_BANK_ACCOUNT` when omitted
- `request.metadata` - Optional flat key/value metadata where all values are strings

**Returns:**

- `CheckoutSession` - Contains the hosted `checkoutUrl`

## License

MIT

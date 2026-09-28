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
  // A cap, not an exact list: channels the currency cannot collect on are dropped
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"],
  metadata: {
    orderId: "ord_123",
    cartId: "cart_456",
  },
});

// Redirect user to checkout URL
window.location.href = session.checkoutUrl;

// The channels the payer will actually be offered
console.log(session.channels);
```

`amount` is sent in minor units. For example, NGN 5,000.00 should be passed as `500000`.

Checkout is available in the sandbox only for now; production answers `403` until
Afriex enables it for your business.

## API

### `createSession(request: CreateCheckoutSessionRequest): Promise<CheckoutSession>`

Creates a hosted checkout session where customers can complete payments.

**Parameters:**

- `request.amount` - Integer amount in minor currency units, minimum `100`
- `request.currency` - Uppercase 3-letter ISO 4217 currency code
- `request.merchantReference` - Unique reference used to identify the session end-to-end
- `request.redirectUrl` - HTTPS URL to return the customer to after checkout
- `request.customer` - Customer information (`name`, `email`, `phone`, `countryCode`)
- `request.channels` - Required, non-empty. Any of `VIRTUAL_BANK_ACCOUNT`, `MOBILE_MONEY`, `CARD`. Channels the currency does not support are dropped
- `request.metadata` - Optional flat key/value metadata where all values are strings

**Returns:**

- `CheckoutSession` - The hosted `checkoutUrl`, plus `channels`: the ones the payer will be offered

**Errors:**

- `409 DUPLICATE_REQUEST` - `merchantReference` is already used by an active session or a transaction
- `422` - none of the requested `channels` is supported for the `currency`

## Reconciling a payment

`CHECKOUT_SESSION.CREATED` fires when the session is created. It is not a payment
signal. Track the payment through `TRANSACTION.UPDATED` on the transaction the
session produces, matched on your `merchantReference`.

## License

MIT

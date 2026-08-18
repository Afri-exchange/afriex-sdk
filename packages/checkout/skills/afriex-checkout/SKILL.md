---
name: afriex-checkout
description: >
  Create Afriex hosted checkout sessions with @afriex/checkout CheckoutService
  createSession. Covers CreateCheckoutSessionRequest — integer amount in minor
  units with a 100 minimum, 3-letter currency, merchantReference, HTTPS
  redirectUrl, the required customer name/email/phone/countryCode block,
  string-only metadata, and which CheckoutChannel values createSession actually
  accepts. Load when building a hosted payment page, redirecting a customer to
  pay, or reconciling a checkout session.
metadata:
  type: core
  library: '@afriex/checkout'
  library_version: '2.0.2'
sources:
  - 'Afri-exchange/afriex-sdk:packages/checkout/src/CheckoutService.ts'
  - 'Afri-exchange/afriex-sdk:packages/checkout/src/types.ts'
---

# Afriex Checkout

`CheckoutService.createSession` posts to `/checkout-session` and returns a
`checkoutUrl` to redirect or embed. Afriex hosts the payment page; the session
is reconciled through the `merchantReference` you supply and the
`CHECKOUT_SESSION.CREATED` webhook.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const session = await afriex.checkout.createSession({
  amount: 500000,
  currency: "NGN",
  merchantReference: "order_9981",
  redirectUrl: "https://shop.example.com/orders/9981/complete",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});

console.log(session.checkoutUrl);
```

`amount` is an integer in the currency's minor units — `500000` is 5,000.00
NGN. The minimum accepted value is `100`.

## Core Patterns

### Restrict the session to specific channels

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const session = await afriex.checkout.createSession({
  amount: 250000,
  currency: "NGN",
  merchantReference: "order_9982",
  redirectUrl: "https://shop.example.com/orders/9982/complete",
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY"],
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});

console.log(session.checkoutUrl);
```

`createSession` accepts only `VIRTUAL_BANK_ACCOUNT` and `MOBILE_MONEY`, and
`channels` is required — the API rejects a session that omits it, so there is no
"offer everything" default. Name the rails you want explicitly.

### Carry your own context on the session

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const session = await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9983",
  redirectUrl: "https://shop.example.com/orders/9983/complete",
  metadata: {
    orderId: "9983",
    cartSize: "3",
    channel: "web",
  },
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});

console.log(session.checkoutUrl);
```

### Convert a major-unit price to the amount the API expects

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

const session = await afriex.checkout.createSession({
  amount: toMinorUnits(4999.5),
  currency: "NGN",
  merchantReference: "order_9984",
  redirectUrl: "https://shop.example.com/orders/9984/complete",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});

console.log(session.checkoutUrl);
```

## Common Mistakes

### CRITICAL Passing a major-unit price as amount

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const priceInNaira = 5000;

const session = await afriex.checkout.createSession({
  amount: priceInNaira,
  currency: "NGN",
  merchantReference: "order_9981",
  redirectUrl: "https://shop.example.com/done",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const priceInNaira = 5000;

const session = await afriex.checkout.createSession({
  amount: Math.round(priceInNaira * 100),
  currency: "NGN",
  merchantReference: "order_9981",
  redirectUrl: "https://shop.example.com/done",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

`amount` is in minor units, so `5000` passes validation as a well-formed
integer above the 100 minimum and charges the customer 50.00 NGN instead of
5,000.00 — the session is created successfully and the shortfall only surfaces
at reconciliation.

Source: packages/checkout/src/CheckoutService.ts (`validateCreateSessionRequest`)

### HIGH Requesting the CARD channel

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import type { CheckoutChannel } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const channels: CheckoutChannel[] = ["CARD", "MOBILE_MONEY"];

await afriex.checkout.createSession({
  amount: 250000,
  currency: "NGN",
  merchantReference: "order_9982",
  redirectUrl: "https://shop.example.com/done",
  channels,
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.checkout.createSession({
  amount: 250000,
  currency: "NGN",
  merchantReference: "order_9982",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY"],
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

`CheckoutChannel` includes `CARD` because a session can report it, but
`createSession` validates against a narrower allowlist of
`VIRTUAL_BANK_ACCOUNT` and `MOBILE_MONEY`, so the request type-checks and then
throws a `ValidationError` at runtime.

Source: packages/checkout/src/CheckoutService.ts (`supportedChannels`)

### HIGH Putting non-string values in metadata

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9983",
  redirectUrl: "https://shop.example.com/done",
  metadata: { orderId: "9983", cartSize: 3 } as Record<string, string>,
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9983",
  redirectUrl: "https://shop.example.com/done",
  metadata: { orderId: "9983", cartSize: String(3) },
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

`metadata` is `Record<string, string>` and every value is checked with
`typeof value !== "string"`, so a numeric or boolean value — common when
spreading an order object — fails validation for the whole session.

Source: packages/checkout/src/CheckoutService.ts (`hasInvalidMetadata`)

### MEDIUM Using an http redirectUrl in development

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9984",
  redirectUrl: "http://localhost:3000/checkout/complete",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9984",
  redirectUrl: process.env.CHECKOUT_RETURN_URL ?? "https://staging.example.com/checkout/complete",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});
```

`isHttpsUrl` requires the `https:` protocol, so a plain-HTTP localhost return
URL is rejected client-side and local checkout testing needs an HTTPS tunnel
or a deployed staging URL.

Source: packages/checkout/src/CheckoutService.ts (`isHttpsUrl`)

### MEDIUM Expecting a session id back from createSession

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const session = await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9985",
  redirectUrl: "https://shop.example.com/done",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});

await saveOrder("order_9985", (session as unknown as { id: string }).id);

async function saveOrder(orderId: string, sessionId: string): Promise<void> {
  console.log(orderId, sessionId);
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const merchantReference = "order_9985";

const session = await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference,
  redirectUrl: "https://shop.example.com/done",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});

await saveOrder(merchantReference, session.checkoutUrl);

async function saveOrder(orderId: string, checkoutUrl: string): Promise<void> {
  console.log(orderId, checkoutUrl);
}
```

`CheckoutSession` carries only `checkoutUrl`, so the stored session id is
`undefined` and later reconciliation has no key; `merchantReference` is the
identifier that ties the session back to your order.

Source: packages/checkout/src/types.ts (`CheckoutSession`)

See also: afriex-webhooks/SKILL.md — `CHECKOUT_SESSION.CREATED` delivery and
signature verification.

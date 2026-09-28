---
name: afriex-checkout
description: >
  Create Afriex hosted checkout sessions with @afriex/checkout CheckoutService
  createSession. Covers CreateCheckoutSessionRequest — integer amount in minor
  units with a 100 minimum, 3-letter currency, merchantReference, HTTPS
  redirectUrl, the required customer name/email/phone/countryCode block,
  string-only metadata, and the required channels cap (VIRTUAL_BANK_ACCOUNT,
  MOBILE_MONEY, CARD). Load when building a hosted payment page, redirecting a
  customer to pay, or reconciling a checkout session.
metadata:
  type: core
  library: '@afriex/checkout'
  library_version: '3.0.1'
sources:
  - 'Afri-exchange/afriex-sdk:packages/checkout/src/CheckoutService.ts'
  - 'Afri-exchange/afriex-sdk:packages/checkout/src/types.ts'
---

# Afriex Checkout

`CheckoutService.createSession` posts to `/checkout-session` and returns a
`checkoutUrl` to redirect or embed. Afriex hosts the payment page; the session
is identified end to end by the `merchantReference` you supply, and the payment
itself is reported through the `TRANSACTION.UPDATED` webhook.

Checkout is available in the sandbox only for now. Production answers `403`
until Afriex enables it for the business.

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
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"],
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  },
});

console.log(session.checkoutUrl, session.channels);
```

`amount` is an integer in the currency's minor units — `500000` is 5,000.00
NGN. The minimum accepted value is `100`.

## Core Patterns

### Send one channel list on every corridor

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";
import type { CheckoutChannel } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const channels: CheckoutChannel[] = ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"];

const session = await afriex.checkout.createSession({
  amount: 250000,
  currency: "KES",
  merchantReference: "order_9982",
  redirectUrl: "https://shop.example.com/orders/9982/complete",
  channels,
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+254712345678",
    countryCode: "KE",
  },
});

console.log("offered to the payer:", session.channels);
```

`channels` is required and is a cap, not an exact list. Channels the `currency`
cannot collect on are dropped, and the ones the payer will actually see come
back as `session.channels`. The request fails with `422` only when none of the
requested channels fits the currency.

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
  channels: ["VIRTUAL_BANK_ACCOUNT", "CARD"],
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

## Common Mistakes

### CRITICAL Passing a major-unit price as amount

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const priceInNaira = 5000;

const session = await afriex.checkout.createSession({
  amount: priceInNaira,
  currency: "NGN",
  merchantReference: "order_9981",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"],
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
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const priceInNaira = 5000;

const session = await afriex.checkout.createSession({
  amount: Math.round(priceInNaira * 100),
  currency: "NGN",
  merchantReference: "order_9981",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"],
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

### CRITICAL Treating CHECKOUT_SESSION.CREATED as payment confirmation

Wrong:

```ts
import type { WebhookPayload } from "@afriex/sdk";

async function onWebhook(event: WebhookPayload): Promise<void> {
  if (event.event === "CHECKOUT_SESSION.CREATED") {
    await markOrderPaid(String(event.data.merchantReference));
  }
}

async function markOrderPaid(reference: string): Promise<void> {
  console.log("paid", reference);
}
```

Correct:

```ts
import type { WebhookPayload } from "@afriex/sdk";

async function onWebhook(event: WebhookPayload): Promise<void> {
  if (event.event === "TRANSACTION.UPDATED" && event.data.status === "SUCCESS") {
    await markOrderPaid(event.data.merchantReference ?? "");
  }
}

async function markOrderPaid(reference: string): Promise<void> {
  console.log("paid", reference);
}
```

`CHECKOUT_SESSION.CREATED` fires the moment the session is created, in the same
call, and says nothing about whether the customer paid. The payment is a
transaction, so its progress arrives as `TRANSACTION.UPDATED`, matched to the
order through `merchantReference`.

Source: packages/webhooks/src/types.ts (`CheckoutSessionEventType`)

### HIGH Assuming every requested channel is offered

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const session = await afriex.checkout.createSession({
  amount: 250000,
  currency: "KES",
  merchantReference: "order_9982",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"],
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+254712345678",
    countryCode: "KE",
  },
});

console.log("Pay by card at", session.checkoutUrl);
```

Correct:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const session = await afriex.checkout.createSession({
  amount: 250000,
  currency: "KES",
  merchantReference: "order_9982",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "MOBILE_MONEY", "CARD"],
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+254712345678",
    countryCode: "KE",
  },
});

const offered = session.channels ?? [];
console.log(offered.includes("CARD") ? "Pay by card" : "Pay by", offered.join(", "));
```

`channels` on the request is a cap. The session is created with the subset the
currency supports, so copy that promises a channel the payer never sees has to
be driven by `session.channels`, not by what was requested.

Source: packages/checkout/src/types.ts (`CheckoutSession.channels`)

### HIGH Putting non-string values in metadata

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9983",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "CARD"],
  metadata: { orderId: "9983", cartSize: 3 } as unknown as Record<string, string>,
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
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9983",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "CARD"],
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
spreading an order object — fails validation for the whole session. The API
also caps metadata at 50 entries, keys at 128 characters and values at 1024,
and the same check enforces those.

Source: packages/checkout/src/CheckoutService.ts (`metadataProblem`)

### MEDIUM Using an http redirectUrl in development

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9984",
  redirectUrl: "http://localhost:3000/checkout/complete",
  channels: ["VIRTUAL_BANK_ACCOUNT", "CARD"],
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
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9984",
  redirectUrl: process.env.CHECKOUT_RETURN_URL ?? "https://staging.example.com/checkout/complete",
  channels: ["VIRTUAL_BANK_ACCOUNT", "CARD"],
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
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const session = await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference: "order_9985",
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "CARD"],
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
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const merchantReference = "order_9985";

const session = await afriex.checkout.createSession({
  amount: 100000,
  currency: "NGN",
  merchantReference,
  redirectUrl: "https://shop.example.com/done",
  channels: ["VIRTUAL_BANK_ACCOUNT", "CARD"],
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

`CheckoutSession` carries `checkoutUrl` and `channels` and no id, so the stored
session id is `undefined` and later reconciliation has no key;
`merchantReference` is the identifier that ties the session back to your order.
Reusing a `merchantReference` that is still active returns
`409 DUPLICATE_REQUEST`.

Source: packages/checkout/src/types.ts (`CheckoutSession`)

See also: afriex-webhooks/SKILL.md — `TRANSACTION.UPDATED` delivery and
signature verification.

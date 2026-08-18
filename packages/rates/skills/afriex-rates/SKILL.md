---
name: afriex-rates
description: >
  Quote Afriex exchange rates with @afriex/rates RateService — getRates for the
  nested rates[from][to] map, getRate for a single pair, and convert for an
  indicative amount. Covers fromSymbols/toSymbols filters, string rate values,
  the updatedAt timestamp, and the difference between an indicative quote and
  the realized rate returned on a transaction. Load when displaying an FX quote,
  estimating a payout, or converting between wallet currencies.
metadata:
  type: core
  library: '@afriex/rates'
  library_version: '2.0.0'
sources:
  - 'Afri-exchange/afriex-sdk:packages/rates/src/RateService.ts'
  - 'Afri-exchange/afriex-sdk:packages/rates/src/types.ts'
---

# Afriex Rates

`RateService` reads exchange rates from `/org/rates`. Rates are quoted as
strings in a nested map keyed base-first: `rates[fromCurrency][toCurrency]` is
how many units of the target currency one unit of the base currency buys.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const quote = await afriex.rates.getRates({
  fromSymbols: ["USD", "GBP"],
  toSymbols: ["NGN", "KES"],
});

console.log(quote.rates.USD.NGN, quote.updatedAt);
```

## Core Patterns

### Quote a single pair

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const rate = await afriex.rates.getRate("USD", "NGN");
console.log(`1 USD = ${rate} NGN`);
```

### Show an indicative converted amount

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const estimate = await afriex.rates.convert(100, "USD", "NGN");
console.log(`≈ ${estimate.toFixed(2)} NGN`);
```

### Build a rate table in one request

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const quote = await afriex.rates.getRates({
  fromSymbols: "USD",
  toSymbols: ["NGN", "GHS", "KES", "UGX"],
});

for (const [currency, rate] of Object.entries(quote.rates.USD ?? {})) {
  console.log(`USD → ${currency}: ${rate}`);
}
```

One `getRates` call covers a whole table; calling `getRate` in a loop issues
one request per pair.

## Common Mistakes

### CRITICAL Settling a transaction at a separately quoted rate

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const payout = await afriex.rates.convert(100, "USD", "NGN");

await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_456",
  sourceAmount: "100.00",
  sourceCurrency: "USD",
  destinationAmount: `${payout.toFixed(2)}` as `${number}`,
  destinationCurrency: "NGN",
  meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const transaction = await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_456",
  sourceAmount: "100.00",
  sourceCurrency: "USD",
  destinationAmount: "0",
  destinationCurrency: "NGN",
  shouldPreferSourceAmount: true,
  meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
});

console.log("realized rate:", transaction.rate);
console.log("actual payout:", transaction.destinationAmount);
```

`getRates` is an indicative quote read at `updatedAt`; the transaction settles
at the rate Afriex realizes at execution time, so pinning `destinationAmount`
to a stale quote debits a different source amount than intended. Let the
source amount drive the payout and read `transaction.rate` afterwards.

Source: packages/transactions/src/types.ts (`Transaction.rate`)

### HIGH Indexing the rates map target-first

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const quote = await afriex.rates.getRates({ fromSymbols: "USD", toSymbols: "NGN" });
const rate = quote.rates.NGN?.USD ?? "0";
console.log(`1 USD = ${rate} NGN`);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const quote = await afriex.rates.getRates({ fromSymbols: "USD", toSymbols: "NGN" });
const rate = quote.rates.USD?.NGN ?? "0";
console.log(`1 USD = ${rate} NGN`);
```

`rates` is keyed `rates[base][target]`, so the reversed lookup resolves to
`undefined` and the `?? "0"` fallback renders a plausible-looking zero rate
instead of raising.

Source: packages/rates/src/types.ts (`RatesResponse.rates`)

### HIGH Letting an unquotable pair reject an unguarded payout

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const rate = await afriex.rates.getRate("USD", "ZAR");
const payout = 100 * parseFloat(rate);
console.log("payout:", payout);
```

Correct:

```ts
import { AfriexSDK, AfriexError } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

try {
  const rate = await afriex.rates.getRate("USD", "ZAR");
  console.log("payout:", 100 * parseFloat(rate));
} catch (error) {
  if (error instanceof AfriexError) {
    // Corridor is not quotable — offer another rail rather than a zero payout.
    console.error("USD to ZAR is not quotable:", error.message);
    return;
  }
  throw error;
}
```

`getRate` throws rather than returning a rate you could multiply by: an
unsupported symbol is rejected by the API with a `400`, and a pair missing from
the response raises `AfriexError`. Neither reaches your arithmetic, so a payout
path that never catches will reject instead of quoting.

Earlier versions fell back to the string `"0"` here, which silently produced a
payout of 0. If you still guard with `parseFloat(rate) <= 0`, that branch is now
dead — handle the throw instead.

Source: packages/rates/src/RateService.ts (`getRate`)

### MEDIUM Reading .data off the getRates result

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const response = await afriex.rates.getRates({ fromSymbols: "USD" });
console.log((response as unknown as { data: { rates: unknown } }).data.rates);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const response = await afriex.rates.getRates({ fromSymbols: "USD" });
console.log(response.rates);
```

`getRates` already unwraps the API envelope and resolves to
`RatesResponse`, so the extra `.data` hop is `undefined` and every downstream
lookup throws or silently yields nothing.

Source: packages/rates/src/RateService.ts (`getRates`)

### MEDIUM Using convert() output as a settlement amount

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const amount = await afriex.rates.convert(19.99, "USD", "NGN");
console.log(`charge exactly ${amount} NGN`);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const amount = await afriex.rates.convert(19.99, "USD", "NGN");
console.log(`approximately ${amount.toFixed(2)} NGN`);
```

`convert` is `amount * parseFloat(rate)` in IEEE-754 double arithmetic, so the
result carries binary rounding error and is suitable for display only — the
authoritative figure is `Transaction.destinationAmount`.

Source: packages/rates/src/RateService.ts (`convert`)

See also: afriex-transactions/SKILL.md — `shouldPreferSourceAmount` and the
realized `rate` field on a settled transaction.

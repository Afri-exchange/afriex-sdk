---
name: afriex-balance
description: >
  Read Afriex business wallet balances with @afriex/balance BalanceService —
  getBalance for a currency map, getBalanceForCurrency for one currency, and
  topUpSandbox to credit a sandbox wallet. Covers the GET /org/balance currency
  filter, the already-unwrapped Record<string, number> return shape, and the
  sandbox-only POST /org/balance/topup endpoint. Load when checking available
  funds before a payout, displaying multi-currency wallet balances, or funding a
  staging wallet for tests.
metadata:
  type: core
  library: '@afriex/balance'
  library_version: '1.4.1'
sources:
  - 'Afri-exchange/afriex-sdk:packages/balance/src/BalanceService.ts'
  - 'Afri-exchange/afriex-sdk:packages/balance/src/types.ts'
---

# Afriex Balance

`BalanceService` reads the business wallet held with Afriex. Balances are
per-currency: the wallet holds a separate amount for each currency and the API
never converts between them.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const balances = await afriex.balance.getBalance();
console.log(balances);

const usd = await afriex.balance.getBalanceForCurrency("USD");
console.log("USD available:", usd);
```

`getBalance()` with no arguments returns every supported currency.

## Core Patterns

### Fetch only the currencies you display

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const balances = await afriex.balance.getBalance({
  currencies: ["USD", "NGN", "KES"],
});

for (const [currency, amount] of Object.entries(balances)) {
  console.log(`${currency}: ${amount}`);
}
```

`currencies` accepts an array or a pre-joined comma-separated string.

### Check funding before creating a payout

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

async function hasFunds(currency: string, required: number): Promise<boolean> {
  const balances = await afriex.balance.getBalance({ currencies: currency });
  const available = balances[currency];
  if (available === undefined) {
    throw new Error(`wallet does not hold ${currency}`);
  }
  return available >= required;
}

console.log(await hasFunds("USD", 100));
```

### Fund a sandbox wallet before an integration test

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

const topUp = await afriex.balance.topUpSandbox({ amount: 10000, currency: "USD" });
console.log(topUp.transactionId, topUp.status);
```

## Common Mistakes

### HIGH Reading .data off the getBalance result

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const balances = await afriex.balance.getBalance({ currencies: "USD" });
console.log((balances as unknown as { data: Record<string, number> }).data.USD);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const balances = await afriex.balance.getBalance({ currencies: "USD" });
console.log(balances.USD);
```

`getBalance` already returns `response.data`, so the extra hop reads
`undefined` and any comparison against it evaluates false — a funding check
written this way blocks every payout.

Source: packages/balance/src/BalanceService.ts (`getBalance`)

### HIGH Treating a 0 from getBalanceForCurrency as a real zero balance

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const available = await afriex.balance.getBalanceForCurrency("ZAR");
if (available === 0) {
  console.log("wallet is empty — top up ZAR");
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const balances = await afriex.balance.getBalance({ currencies: "ZAR" });
const available = balances.ZAR;
if (available === undefined) {
  console.log("wallet does not hold ZAR at all");
} else if (available === 0) {
  console.log("wallet is empty — top up ZAR");
}
```

`getBalanceForCurrency` returns `balances[currency] ?? 0`, so an unsupported or
absent currency is indistinguishable from a genuinely empty wallet and the
operator is told to top up a currency the wallet cannot hold.

Source: packages/balance/src/BalanceService.ts (`getBalanceForCurrency`)

### HIGH Calling topUpSandbox against production

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
});

await afriex.balance.topUpSandbox({ amount: 10000, currency: "USD" });
```

Correct:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.balance.topUpSandbox({ amount: 10000, currency: "USD" });
```

`POST /org/balance/topup` exists only in the sandbox and answers
`403 FORBIDDEN` in production; a seeding step that runs in both environments
fails only after deploy, where it reads as an API-key permission problem.

Source: packages/balance/src/BalanceService.ts (`topUpSandbox`)

### MEDIUM Summing balances across currencies

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const balances = await afriex.balance.getBalance();
const total = Object.values(balances).reduce((sum, amount) => sum + amount, 0);
console.log("total wallet value:", total);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const balances = await afriex.balance.getBalance();
const rates = await afriex.rates.getRates({
  fromSymbols: Object.keys(balances),
  toSymbols: "USD",
});

const totalUsd = Object.entries(balances).reduce((sum, [currency, amount]) => {
  const rate = currency === "USD" ? "1" : rates.rates[currency]?.USD ?? "0";
  return sum + amount * parseFloat(rate);
}, 0);

console.log("total wallet value in USD:", totalUsd);
```

`getBalance` returns raw per-currency amounts with no common unit, so adding
them treats 1 NGN as 1 USD and reports a wallet value off by orders of
magnitude.

Source: packages/balance/src/types.ts (`BalanceResponse`)

See also: afriex-rates/SKILL.md — converting balances to a display currency.

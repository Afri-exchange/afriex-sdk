---
name: afriex-payment-methods
description: >
  Create and resolve Afriex payout and collection rails with
  @afriex/payment-methods PaymentMethodService — create, get, list, delete,
  getInstitutions, resolveAccount, resolveInstitutionCode, getCryptoWallet,
  listVirtualAccounts, createVirtualAccount, and listPoolAccounts. Covers
  PaymentChannel vs CreatablePaymentChannel, the WITHDRAW/DEPOSIT type flag,
  institution codes, SWIFT and routing-number lookup, static vs dynamic virtual
  accounts, and production-only endpoints. Load when adding a bank account or
  mobile money wallet, resolving an account name, or issuing a virtual account.
metadata:
  type: core
  library: '@afriex/payment-methods'
  library_version: '3.0.1'
sources:
  - 'Afri-exchange/afriex-sdk:packages/payment-methods/src/PaymentMethodService.ts'
  - 'Afri-exchange/afriex-sdk:packages/payment-methods/src/types.ts'
---

# Afriex Payment Methods

`PaymentMethodService` maps to the `/payment-method` endpoints. A payment
method is the rail a transaction moves money over: it becomes the
`destinationId` of a `WITHDRAW` or the `sourceId` of a `DEPOSIT`.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const institutions = await afriex.paymentMethods.getInstitutions({
  channel: "BANK_ACCOUNT",
  countryCode: "NG",
});

const gtb = institutions.find((i) => i.institutionName.includes("Guaranty"))!;

const paymentMethod = await afriex.paymentMethods.create({
  channel: "BANK_ACCOUNT",
  customerId: "cus_123",
  accountName: "Ada Lovelace",
  accountNumber: "0123456789",
  countryCode: "NG",
  institution: {
    institutionId: gtb.institutionId,
    institutionCode: gtb.institutionCode,
    institutionName: gtb.institutionName,
  },
});

console.log(paymentMethod.paymentMethodId, paymentMethod.capabilities);
```

## Core Patterns

### Confirm the account holder before saving the rail

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const resolved = await afriex.paymentMethods.resolveAccount({
  channel: "BANK_ACCOUNT",
  countryCode: "NG",
  accountNumber: "0123456789",
  institutionCode: "058",
});

console.log(resolved.recipientName);
```

`institutionCode` is required when `channel` is `BANK_ACCOUNT`; `MOBILE_MONEY`
resolves from the phone number alone.

### Create a collection rail (DEPOSIT capability)

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const collectionRail = await afriex.paymentMethods.create({
  channel: "MOBILE_MONEY",
  type: "DEPOSIT",
  customerId: "cus_123",
  accountName: "Ada Lovelace",
  accountNumber: "+254712345678",
  countryCode: "KE",
  institution: { institutionCode: "MPESA", institutionName: "M-Pesa" },
});

console.log(collectionRail.paymentMethodId);
```

### Issue a static or dynamic virtual account

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
});

const staticAccount = await afriex.paymentMethods.createVirtualAccount({
  currency: "NGN",
  customerId: "cus_123",
  label: "SALES",
});

const dynamicAccount = await afriex.paymentMethods.createVirtualAccount({
  currency: "NGN",
  customerId: "cus_123",
  amount: 50000,
  reference: "invoice_772",
});

console.log(staticAccount.accountNumber, dynamicAccount.expiresInMinutes);
```

`label` and `amount` are mutually exclusive: `label` names a permanent
account, `amount` mints a single-use one.

### Resolve a SWIFT code or US routing number to a bank name

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const bank = await afriex.paymentMethods.resolveInstitutionCode({
  codeType: "routing_number",
  country: "US",
  searchTerm: "021000021",
});

console.log(bank?.bankName);
```

`routing_number` lookups are US-only; every other country uses `swift_code`.

## Common Mistakes

### CRITICAL Using a default payment method as a deposit source

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const rail = await afriex.paymentMethods.create({
  channel: "MOBILE_MONEY",
  customerId: "cus_123",
  accountName: "Ada Lovelace",
  accountNumber: "+254712345678",
  countryCode: "KE",
  institution: { institutionCode: "MPESA" },
});

console.log("collect from", rail.paymentMethodId);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const rail = await afriex.paymentMethods.create({
  channel: "MOBILE_MONEY",
  type: "DEPOSIT",
  customerId: "cus_123",
  accountName: "Ada Lovelace",
  accountNumber: "+254712345678",
  countryCode: "KE",
  institution: { institutionCode: "MPESA" },
});

console.log("collect from", rail.paymentMethodId);
```

`CreatePaymentMethodRequest.type` defaults to `WITHDRAW`, so the rail is
created payout-only and later fails as a `sourceId` on a `DEPOSIT`
transaction rather than at creation time.

Source: packages/payment-methods/src/types.ts (`CreatePaymentMethodRequest.type`)

### HIGH Listing payment methods without widening the default filters

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const all = await afriex.paymentMethods.list({ limit: 100 });
console.log("every rail:", all.total);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const all = await afriex.paymentMethods.list({
  limit: 100,
  capabilities: ["WITHDRAW", "DEPOSIT"],
  status: ["active", "pending", "blocked", "expired"],
});
console.log("every rail:", all.total);
```

The endpoint defaults `capabilities` to `WITHDRAW` and `status` to
`active,pending`, so deposit rails and blocked or expired rails are silently
absent from a list that looks complete.

Source: packages/payment-methods/src/types.ts (`ListPaymentMethodsParams`)

### HIGH Iterating the result of listPoolAccounts

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import type { PaymentMethod } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const pools = await afriex.paymentMethods.listPoolAccounts({ country: "US" });
for (const pool of pools as unknown as PaymentMethod[]) {
  console.log(pool.paymentMethodId);
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const pool = await afriex.paymentMethods.listPoolAccounts({ country: "US" });
console.log(pool.paymentMethodId, pool.accountNumber);
```

Despite the plural name, `listPoolAccounts` unwraps `PoolAccountResponse.data`
and returns a single `PaymentMethod`, so treating it as a collection yields
nothing.

Source: packages/payment-methods/src/PaymentMethodService.ts (`listPoolAccounts`)

### HIGH Testing virtual accounts, pool accounts, or crypto wallets in staging

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const account = await afriex.paymentMethods.createVirtualAccount({
  currency: "NGN",
  customerId: "cus_123",
  label: "SALES",
});
```

Correct:

```ts
import { AfriexSDK, Environment, ApiError, AfriexErrorCode } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
});

try {
  const account = await afriex.paymentMethods.createVirtualAccount({
    currency: "NGN",
    customerId: "cus_123",
    label: "SALES",
  });
  console.log(account.accountNumber);
} catch (error) {
  if (error instanceof ApiError && error.errorCode === AfriexErrorCode.FORBIDDEN) {
    console.log("endpoint is production-only");
  }
}
```

`createVirtualAccount`, `listVirtualAccounts`, `listPoolAccounts`, and
`getCryptoWallet` are production-only and answer `403 FORBIDDEN` in the
sandbox, which reads as a permissions problem with the API key rather than an
environment limitation.

Source: packages/payment-methods/src/PaymentMethodService.ts (production-only notes)

### MEDIUM Combining label and amount on a virtual account

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
});

await afriex.paymentMethods.createVirtualAccount({
  currency: "NGN",
  label: "SALES",
  amount: 50000,
});
```

Correct:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
});

await afriex.paymentMethods.createVirtualAccount({
  currency: "NGN",
  amount: 50000,
  reference: "invoice_772",
});
```

`createVirtualAccount` declares `label` and `amount` mutually exclusive and
throws a `ValidationError` before the request, so the "labelled account with a
suggested amount" the code intends is never created.

Source: packages/payment-methods/src/PaymentMethodService.ts (`createVirtualAccount`)

### MEDIUM Deriving currency from countryCode

Wrong:

```ts
import type { PaymentMethod } from "@afriex/sdk";

const CURRENCY_BY_COUNTRY: Record<string, string> = { NG: "NGN", US: "USD" };

function currencyOf(paymentMethod: PaymentMethod): string {
  return CURRENCY_BY_COUNTRY[paymentMethod.countryCode] ?? "USD";
}
```

Correct:

```ts
import type { PaymentMethod } from "@afriex/sdk";

function currencyOf(paymentMethod: PaymentMethod): string | undefined {
  return paymentMethod.currency;
}
```

A country can host rails in more than one currency (USD domiciliary accounts
in Nigeria, for example), so the mapping quietly labels a USD account as NGN
and any amount computed from it is wrong by the exchange rate.

Source: packages/payment-methods/src/types.ts (`PaymentMethod.currency`)

See also: afriex-transactions/SKILL.md — `paymentMethodId` is what a
transaction's `sourceId` and `destinationId` refer to.

---
name: afriex-payment-methods
description: >
  Create and resolve Afriex payout and collection rails with
  @afriex/payment-methods PaymentMethodService — create, get, list, delete,
  getInstitutions, resolveAccount, resolveInstitutionCode, getCryptoWallet,
  listVirtualAccounts, createVirtualAccount, getPoolAccount, and the
  sandbox-only simulateTransfer. Covers
  PaymentChannel vs CreatablePaymentChannel, the fields each channel requires,
  the WITHDRAW/DEPOSIT type flag, institution codes, SWIFT and routing-number
  lookup, the list filters, and static vs dynamic virtual accounts. Load when
  adding a bank account or mobile money wallet, resolving an account name, or
  issuing a virtual account.
metadata:
  type: core
  library: '@afriex/payment-methods'
  library_version: '4.1.0'
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

const { data: institutions } = await afriex.paymentMethods.getInstitutions({
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
    institutionCode: gtb.institutionCode,
    institutionName: gtb.institutionName,
  },
});

// `institutionId` is documented but rarely populated on a listing — match
// directory entries to payment methods on `institutionCode`.

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

console.log(resolved.data.recipientName);
```

`institutionCode` is required on both channels: the bank code for
`BANK_ACCOUNT`, the provider code for `MOBILE_MONEY`. Get it from
`getInstitutions`.

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
  accountNumber: "254712345678",
  countryCode: "KE",
  institution: { institutionCode: "SAFARICOM", institutionName: "SAFARICOM" },
});

console.log(collectionRail.paymentMethodId);
```

For `MOBILE_MONEY`, `accountNumber` is the phone number as digits only:
country code plus national number. A leading `+` is rejected.

### Create a rail addressed by an alias (UPI, Interac)

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const upi = await afriex.paymentMethods.create({
  channel: "UPI",
  customerId: "cus_123",
  accountName: "Raj Kumar",
  accountNumber: "rajkumar@upi",
  countryCode: "IN",
});

console.log(upi.paymentMethodId);
```

`UPI` and `INTERAC` take no `institution`: the UPI ID or Interac email
identifies the account. Every other creatable channel except
`VIRTUAL_BANK_ACCOUNT` requires `accountName`, `accountNumber` and
`institution`.

### Issue a static or dynamic virtual account

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
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
});

console.log(staticAccount?.accountNumber, dynamicAccount?.reference);
```

`label` and `amount` are mutually exclusive: `label` names a permanent
account, `amount` mints a single-use one that carries its own `reference`. A
virtual account for a customer can only be `NGN`; omit `customerId` to create
one in another currency for the business.

### Pay into a sandbox virtual account

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

const account = await afriex.paymentMethods.createVirtualAccount({
  currency: "NGN",
  customerId: "cus_123",
  amount: 50000,
});

if (account?.accountNumber) {
  const transfer = await afriex.paymentMethods.simulateTransfer({
    accountNumber: account.accountNumber,
    amount: 50000,
    currency: "NGN",
    reference: account.reference,
  });
  console.log(transfer.reference);
}
```

A sandbox virtual account receives no money on its own. `simulateTransfer`
credits it the way a bank transfer would, and the deposit is reported by the
transaction webhook. `reference` is needed only for an account created with an
`amount`. Production answers `403`.

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

console.log(bank.data?.bankName);
```

`routing_number` lookups are US-only; every other country uses `swift_code`.
`data` is `null` when the code does not resolve.

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
  accountNumber: "254712345678",
  countryCode: "KE",
  institution: { institutionCode: "SAFARICOM", institutionName: "SAFARICOM" },
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
  accountNumber: "254712345678",
  countryCode: "KE",
  institution: { institutionCode: "SAFARICOM", institutionName: "SAFARICOM" },
});

console.log("collect from", rail.paymentMethodId);
```

`CreatePaymentMethodRequest.type` defaults to `WITHDRAW`, so the rail is
created payout-only and later fails as a `sourceId` on a `DEPOSIT`
transaction rather than at creation time.

Source: packages/payment-methods/src/types.ts (`CreatePaymentMethodRequest.type`)

### HIGH Treating the payment method list as complete

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const all = await afriex.paymentMethods.list({ limit: 100 });
const depositRail = all.data.find((pm) => pm.capabilities?.includes("DEPOSIT"));
console.log("collect from", depositRail?.paymentMethodId);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const created = await afriex.paymentMethods.create({
  channel: "MOBILE_MONEY",
  type: "DEPOSIT",
  customerId: "cus_123",
  accountName: "Ada Lovelace",
  accountNumber: "254712345678",
  countryCode: "KE",
  institution: { institutionCode: "SAFARICOM", institutionName: "SAFARICOM" },
});

await saveDepositRail("cus_123", created.paymentMethodId);

const depositRail = await afriex.paymentMethods.get(created.paymentMethodId);
console.log("collect from", depositRail.paymentMethodId);

async function saveDepositRail(customerId: string, paymentMethodId: string): Promise<void> {
  console.log(customerId, paymentMethodId);
}
```

The list returns payout rails only: `capabilities` accepts nothing but
`WITHDRAW`, and `status` nothing but `active` and `pending`. Any other filter
value answers 422. Deposit rails and blocked, expired or deleted rails never
appear in it, so store the `paymentMethodId` when you create one and fetch it
with `get`.

Source: packages/payment-methods/src/types.ts (`ListPaymentMethodsParams`)

### HIGH Iterating the result of listPoolAccounts

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import type { PaymentMethod } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const pools = await afriex.paymentMethods.listPoolAccounts({ country: "NG" });
for (const pool of pools as unknown as PaymentMethod[]) {
  console.log(pool.paymentMethodId);
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const pool = await afriex.paymentMethods.getPoolAccount({ country: "NG" });
console.log(pool.accountNumber, pool.reference);
```

There is one pool account per country. `getPoolAccount` returns it as a single
`PaymentMethod`; `listPoolAccounts` is the deprecated name for the same call,
and treating its result as a collection yields nothing. Reconcile incoming
deposits against `reference`.

Source: packages/payment-methods/src/PaymentMethodService.ts (`getPoolAccount`)

### HIGH Reading a virtual account that is still being opened

Wrong:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";
import type { PaymentMethod } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const account = (await afriex.paymentMethods.createVirtualAccount({
  currency: "KES",
  label: "COLLECTIONS",
})) as PaymentMethod;

console.log("pay into", account.accountNumber);
```

Correct:

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const account = await afriex.paymentMethods.createVirtualAccount({
  currency: "KES",
  label: "COLLECTIONS",
});

if (account) {
  console.log("pay into", account.accountNumber);
} else {
  console.log("account is being opened; wait for PAYMENT_METHOD.CREATED");
}
```

For some currencies the issuing bank opens the account after the request
returns. The API then answers 201 with an empty body and
`createVirtualAccount` resolves to `null`; the account arrives through the
`PAYMENT_METHOD.CREATED` webhook. Asserting the result away reads
`accountNumber` off `null` and throws.

Source: packages/payment-methods/src/PaymentMethodService.ts (`createVirtualAccount`)

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

const account = await afriex.paymentMethods.createVirtualAccount({
  currency: "NGN",
  amount: 50000,
});

console.log(account?.reference);
```

`createVirtualAccount` declares `label` and `amount` mutually exclusive and
throws a `ValidationError` before the request, so the "labelled account with a
suggested amount" the code intends is never created. A one-time account gets
its `reference` from Afriex; the request cannot set one.

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

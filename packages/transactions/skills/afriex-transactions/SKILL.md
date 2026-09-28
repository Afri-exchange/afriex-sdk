---
name: afriex-transactions
description: >
  Move money with @afriex/transactions TransactionService — create WITHDRAW,
  DEPOSIT, and SWAP transactions, get, list, and authorize. Covers the required
  meta.idempotencyKey and meta.reference, sourceAmount/destinationAmount string
  amounts, shouldPreferSourceAmount, TransactionStatus values including
  CUSTOMER_ACTION_REQUIRED and OTP authorization, TransactionChannel and status
  list filters, and meta.failureReason AFX_* codes. Load when sending a payout,
  collecting a deposit, swapping currencies, polling transaction status, or
  handling a failed transfer.
metadata:
  type: core
  library: '@afriex/transactions'
  library_version: '2.1.0'
sources:
  - 'Afri-exchange/afriex-sdk:packages/transactions/src/TransactionService.ts'
  - 'Afri-exchange/afriex-sdk:packages/transactions/src/types.ts'
---

# Afriex Transactions

`TransactionService` maps to the `/transaction` endpoints. A transaction is
one of three types: `WITHDRAW` sends funds to a destination payment method,
`DEPOSIT` pulls funds from a source payment method, and `SWAP` exchanges
currencies inside the wallet. `type` defaults to `WITHDRAW` when omitted.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const transaction = await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_456",
  sourceAmount: "100.00",
  sourceCurrency: "USD",
  destinationAmount: "150000.00",
  destinationCurrency: "NGN",
  meta: {
    idempotencyKey: randomUUID(),
    reference: "order_9981",
    narration: "Invoice 9981 payout",
  },
});

console.log(transaction.transactionId, transaction.status);
```

Amounts are accepted as decimal strings (`"100.00"`) or numbers, and always
come back as strings. One amount is enough: send `sourceAmount` or
`destinationAmount` and the API derives the other at the live rate.
`meta.idempotencyKey` and `meta.reference` are both required on every create.

## Core Patterns

### Pull funds from a customer's payment method (deposit)

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const deposit = await afriex.transactions.create({
  type: "DEPOSIT",
  customerId: "cus_123",
  sourceId: "pm_789",
  sourceAmount: "50000.00",
  sourceCurrency: "NGN",
  destinationAmount: "32.00",
  destinationCurrency: "USD",
  meta: { idempotencyKey: randomUUID(), reference: "topup_551" },
});

if (deposit.status === "CUSTOMER_ACTION_REQUIRED" && deposit.meta?.otpRequired) {
  const authorized = await afriex.transactions.authorize(deposit.transactionId, {
    type: "OTP",
    otp: "123456",
  });
  console.log(authorized.status);
}
```

### Swap currencies inside the wallet

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const swap = await afriex.transactions.create({
  type: "SWAP",
  sourceAmount: "1000.00",
  sourceCurrency: "USD",
  destinationCurrency: "KES",
  meta: { idempotencyKey: randomUUID(), reference: "treasury_rebalance_12" },
});

console.log(swap.destinationAmount, swap.rate);
```

`SWAP` needs no `customerId` and no `destinationId`, and takes exactly one
amount. The API computes the other side from the live rate and rejects a swap
that sends both.

### Filter the transaction list by several statuses and channels

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const failed = await afriex.transactions.list({
  status: ["FAILED", "REJECTED"],
  channel: ["BANK_ACCOUNT", "MOBILE_MONEY"],
  fromDate: "2026-01-01T00:00:00.000Z",
  toDate: "2026-01-31T23:59:59.999Z",
  limit: 100,
});

for (const transaction of failed.data) {
  console.log(transaction.transactionId, transaction.meta?.failureReason?.code);
}
```

Array filters are joined into comma-separated query values by the service.
Pages start at `0`.

### Decide whether a failure is worth retrying

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const transaction = await afriex.transactions.get("txn_123");

if (transaction.status === "FAILED" || transaction.status === "REJECTED") {
  const reason = transaction.meta?.failureReason;
  console.log(reason?.code, reason?.message, reason?.retryable);
}
```

`failureReason.code` is a stable `AFX_*` value; `retryable` says whether
resubmitting with a fresh `idempotencyKey` can succeed. The set of codes grows
over time, so fall back to `message` for a code you do not recognise.

`IN_REVIEW` and `RFI_REQUESTED` are review states: the transaction is still in
flight. Treat them, and any status you do not recognise, as non-terminal.

## Common Mistakes

### CRITICAL Generating a new idempotency key on every retry

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

async function payout(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await afriex.transactions.create({
        customerId: "cus_123",
        destinationId: "pm_456",
        sourceAmount: "100.00",
        sourceCurrency: "USD",
        destinationAmount: "150000.00",
        destinationCurrency: "NGN",
        meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
      });
      return;
    } catch {
      continue;
    }
  }
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

async function payout(): Promise<void> {
  const idempotencyKey = randomUUID();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await afriex.transactions.create({
        customerId: "cus_123",
        destinationId: "pm_456",
        sourceAmount: "100.00",
        sourceCurrency: "USD",
        destinationAmount: "150000.00",
        destinationCurrency: "NGN",
        meta: { idempotencyKey, reference: "order_9981" },
      });
      return;
    } catch {
      continue;
    }
  }
}
```

A timeout or 5xx can leave a transaction created on the Afriex side; retrying
with a new key makes it a distinct transaction, so the recipient is paid twice.
Generate the key once per logical payment and reuse it for every attempt.

A reused key, or a reused `reference`, is answered with
`409 DUPLICATE_REQUEST`. The original transaction is not replayed, so a 409
means the payment already exists: look it up with
`list({ reference })` before deciding anything else.

Source: packages/transactions/src/types.ts (`TransactionMeta.idempotencyKey`)

### CRITICAL Treating a resolved create() as settled money

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const transaction = await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_456",
  sourceAmount: "100.00",
  sourceCurrency: "USD",
  destinationAmount: "150000.00",
  destinationCurrency: "NGN",
  meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
});

console.log("payout delivered", transaction.transactionId);
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
  destinationAmount: "150000.00",
  destinationCurrency: "NGN",
  meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
});

if (transaction.status === "SUCCESS") {
  console.log("payout delivered", transaction.transactionId);
} else {
  console.log("awaiting TRANSACTION.UPDATED webhook", transaction.status);
}
```

`create` resolves as soon as the transaction is accepted, typically with
status `PENDING` or `PROCESSING`; settlement is reported later through the
`TRANSACTION.UPDATED` webhook.

Source: packages/transactions/src/types.ts (`TransactionStatus`)

### HIGH Comparing transaction status against COMPLETED

Wrong:

```ts
import type { Transaction } from "@afriex/sdk";

function isSettled(transaction: Transaction): boolean {
  return transaction.status === "COMPLETED";
}
```

Correct:

```ts
import type { Transaction } from "@afriex/sdk";

function isSettled(transaction: Transaction): boolean {
  return transaction.status === "SUCCESS";
}
```

The API never returns `COMPLETED` — the terminal success value is `SUCCESS`,
so the comparison is never true and settled payouts are treated as still
pending. `TransactionStatus.COMPLETED` exists only as a deprecated member for
older stored values, and the list endpoint rejects it as a filter.

Source: packages/transactions/src/types.ts (`TransactionStatus`)

### HIGH Expecting sourceAmount to drive the payout when both amounts are sent

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_456",
  sourceAmount: "100.00",
  sourceCurrency: "USD",
  destinationAmount: "150000.00",
  destinationCurrency: "NGN",
  meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_456",
  sourceAmount: "100.00",
  sourceCurrency: "USD",
  destinationAmount: "150000.00",
  destinationCurrency: "NGN",
  shouldPreferSourceAmount: true,
  meta: { idempotencyKey: randomUUID(), reference: "order_9981" },
});
```

`shouldPreferSourceAmount` defaults to `false`, so the API honours
`destinationAmount` and debits whatever source amount the rate implies — a
stale client-side quote then debits more than the intended 100.00 USD.

Source: packages/transactions/src/types.ts (`CreateTransactionBase.shouldPreferSourceAmount`)

### HIGH Ignoring CUSTOMER_ACTION_REQUIRED on deposits

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const deposit = await afriex.transactions.create({
  type: "DEPOSIT",
  customerId: "cus_123",
  sourceId: "pm_789",
  sourceAmount: "50000.00",
  sourceCurrency: "NGN",
  destinationAmount: "32.00",
  destinationCurrency: "USD",
  meta: { idempotencyKey: randomUUID(), reference: "topup_551" },
});

console.log("collected", deposit.transactionId);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";
import { randomUUID } from "node:crypto";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const deposit = await afriex.transactions.create({
  type: "DEPOSIT",
  customerId: "cus_123",
  sourceId: "pm_789",
  sourceAmount: "50000.00",
  sourceCurrency: "NGN",
  destinationAmount: "32.00",
  destinationCurrency: "USD",
  meta: { idempotencyKey: randomUUID(), reference: "topup_551" },
});

if (deposit.status === "CUSTOMER_ACTION_REQUIRED" && deposit.meta?.otpRequired) {
  await afriex.transactions.authorize(deposit.transactionId, {
    type: "OTP",
    otp: await promptCustomerForOtp(),
  });
}

async function promptCustomerForOtp(): Promise<string> {
  return "123456";
}
```

Mobile-money deposits park in `CUSTOMER_ACTION_REQUIRED` with
`meta.otpRequired === true` and never settle until `authorize` is called with
the customer's one-time password.

Source: packages/transactions/src/TransactionService.ts (`authorize`)

### MEDIUM Reading destinationId on a SWAP transaction

Wrong:

```ts
import type { Transaction } from "@afriex/sdk";

function destinationOf(transaction: Transaction): string {
  return transaction.destinationId!.toUpperCase();
}
```

Correct:

```ts
import type { Transaction } from "@afriex/sdk";

function destinationOf(transaction: Transaction): string {
  if (transaction.type === "SWAP" || !transaction.destinationId) {
    return transaction.destinationCurrency;
  }
  return transaction.destinationId.toUpperCase();
}
```

`SWAP` settles inside the wallet and carries no destination payment method, so
`destinationId` is `undefined` and the non-null assertion throws at runtime
for exactly the transactions that succeeded.

Source: packages/transactions/src/types.ts (`Transaction.destinationId`)

See also: afriex-webhooks/SKILL.md — settlement is delivered through
`TRANSACTION.UPDATED`, not by polling.

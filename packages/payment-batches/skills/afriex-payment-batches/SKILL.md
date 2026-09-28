---
name: afriex-payment-batches
description: >
  Pay many recipients in one call with @afriex/payment-batches
  PaymentBatchService — create a batch funded from a wallet, addRecipient and
  addRecipients, listRecipients, updateRecipient, removeRecipient, withdraw to
  start the payouts, and listSessions to read a run. Covers the successes and
  errors outcome maps and what they are keyed by, recipientId versus
  paymentMethodId, whole-object updates, and retrying only the failed payouts
  with sessionId. Load when building payroll, vendor or other bulk payouts on
  Afriex.
metadata:
  type: core
  library: '@afriex/payment-batches'
  library_version: '1.0.0'
sources:
  - 'Afri-exchange/afriex-sdk:packages/payment-batches/src/PaymentBatchService.ts'
  - 'Afri-exchange/afriex-sdk:packages/payment-batches/src/types.ts'
---

# Afriex Payment Batches

A payment batch is a saved list of recipients, each with the amount it is paid.
`withdraw` creates a payout for every recipient in one call and records the run
as a session. Every payout is converted from the currency of the wallet the
batch is funded from.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const batch = await afriex.paymentBatches.create({
  name: "June payroll",
  sourcePaymentMethod: { currencyCode: "USD" },
});

const added = await afriex.paymentBatches.addRecipients(batch.id, [
  {
    channel: "BANK_ACCOUNT",
    accountName: "Ada Obi",
    accountNumber: "0123456789",
    countryCode: "NG",
    institution: { institutionCode: "000013", institutionName: "GTBank" },
    amount: { value: "20000", currencyCode: "NGN" },
  },
]);

console.log(added.successes, added.errors);
```

## Core Patterns

### Run a batch and read what happened to each recipient

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const run = await afriex.paymentBatches.withdraw("batch_123");

for (const [recipientId, reason] of Object.entries(run.errors)) {
  console.log(`not paid: ${recipientId} (${reason})`);
}

for (const recipientId of Object.keys(run.successes)) {
  console.log(`payout started: ${recipientId}`);
}
```

Both maps are keyed by `recipientId`. A recipient in `successes` has a payout
in flight, not a settled one: follow it through the `TRANSACTION.UPDATED`
webhook.

### Retry only the payouts that failed

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const sessions = await afriex.paymentBatches.listSessions("batch_123", {
  page: 0,
  limit: 1,
});
const lastRun = sessions.data[0];

const failed = Object.entries(lastRun?.meta?.results ?? {}).filter(
  ([, result]) => result.status === "PROCESSING_FAILED"
);

if (lastRun && failed.length > 0) {
  await afriex.paymentBatches.withdraw("batch_123", {
    sessionId: lastRun.id,
  });
}
```

### Change what a recipient is paid

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const recipients = await afriex.paymentBatches.listRecipients("batch_123");
const recipient = recipients.data.find(
  (item) => item.accountNumber === "0123456789"
);

if (recipient?.accountNumber && recipient.institution) {
  await afriex.paymentBatches.updateRecipient(
    "batch_123",
    recipient.recipientId,
    {
      channel: recipient.channel,
      accountName: recipient.accountName,
      accountNumber: recipient.accountNumber,
      countryCode: recipient.countryCode,
      institution: recipient.institution,
      amount: { value: "25000", currencyCode: "NGN" },
      paymentMethodId: recipient.paymentMethodId,
    }
  );
}
```

An update replaces the recipient whole, so it carries the account details as
well as the new amount.

## Common Mistakes

### CRITICAL Calling withdraw again to retry failed payouts

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const run = await afriex.paymentBatches.withdraw("batch_123");

if (Object.keys(run.errors).length > 0) {
  await afriex.paymentBatches.withdraw("batch_123");
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const run = await afriex.paymentBatches.withdraw("batch_123");

if (Object.keys(run.errors).length > 0) {
  const sessions = await afriex.paymentBatches.listSessions("batch_123", {
    limit: 1,
  });
  await afriex.paymentBatches.withdraw("batch_123", {
    sessionId: sessions.data[0].id,
  });
}
```

Every `withdraw` without a `sessionId` is a new run and pays every recipient
again, the ones already paid included. Only a call that names the earlier run
is limited to the recipients that failed in it.

Source: packages/payment-batches/src/PaymentBatchService.ts (`withdraw`)

### HIGH Using the id from addRecipient as the recipientId

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const saved = await afriex.paymentBatches.addRecipient("batch_123", {
  channel: "BANK_ACCOUNT",
  accountName: "Ada Obi",
  accountNumber: "0123456789",
  countryCode: "NG",
  institution: { institutionCode: "000013", institutionName: "GTBank" },
  amount: { value: "20000", currencyCode: "NGN" },
});

await afriex.paymentBatches.removeRecipient("batch_123", saved.id);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const saved = await afriex.paymentBatches.addRecipient("batch_123", {
  channel: "BANK_ACCOUNT",
  accountName: "Ada Obi",
  accountNumber: "0123456789",
  countryCode: "NG",
  institution: { institutionCode: "000013", institutionName: "GTBank" },
  amount: { value: "20000", currencyCode: "NGN" },
});

const recipients = await afriex.paymentBatches.listRecipients("batch_123");
const recipient = recipients.data.find(
  (item) => item.paymentMethodId === saved.id
);

if (recipient) {
  await afriex.paymentBatches.removeRecipient(
    "batch_123",
    recipient.recipientId
  );
}
```

`addRecipient` and `updateRecipient` return the saved account, whose `id` is
the recipient's `paymentMethodId`. The `recipientId` that update and remove
take comes only from `listRecipients`; the other id is answered with
`400 INVALID_BUSINESS_PAYMENT_BATCH_REQUEST`.

Source: packages/payment-batches/src/types.ts (`SavedPaymentBatchRecipient`)

### HIGH Treating a resolved addRecipients as every recipient added

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";
import type { PaymentBatchRecipientRequest } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export async function load(recipients: PaymentBatchRecipientRequest[]) {
  await afriex.paymentBatches.addRecipients("batch_123", recipients);
  return afriex.paymentBatches.withdraw("batch_123");
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";
import type { PaymentBatchRecipientRequest } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export async function load(recipients: PaymentBatchRecipientRequest[]) {
  const added = await afriex.paymentBatches.addRecipients(
    "batch_123",
    recipients
  );

  const rejected = Object.entries(added.errors);
  if (rejected.length > 0) {
    throw new Error(
      `not added: ${rejected.map(([account]) => account).join(", ")}`
    );
  }

  return afriex.paymentBatches.withdraw("batch_123");
}
```

Recipients are added one by one, and the call answers `201` even when some of
them are rejected. The rejected ones are reported in `errors`, keyed by account
number, and are simply missing from the batch when it runs.

Source: packages/payment-batches/src/PaymentBatchService.ts (`addRecipients`)

### MEDIUM Sending only the changed field on an update

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.paymentBatches.update("batch_123", {
  name: "July payroll",
} as never);
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const batch = await afriex.paymentBatches.get("batch_123");

await afriex.paymentBatches.update("batch_123", {
  name: "July payroll",
  sourcePaymentMethod: {
    currencyCode: batch.sourcePaymentMethod.currencyCode,
  },
});
```

`update` and `updateRecipient` replace the object whole. The API rejects a
request that leaves a required field out, so both throw a `ValidationError`
first.

Source: packages/payment-batches/src/PaymentBatchService.ts (`update`)

See also: afriex-transactions/SKILL.md — following a payout to settlement.

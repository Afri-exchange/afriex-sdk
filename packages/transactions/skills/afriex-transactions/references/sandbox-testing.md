# Testing transactions in the sandbox

No real money moves in the sandbox. A deposit or payout completes on its own
about 5 minutes after it is created, and the webhook receives the final status
as it would in production.

## Complete a transaction sooner

```ts
import { randomUUID } from "node:crypto";
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

const transaction = await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_ending_0003",
  sourceAmount: "5",
  sourceCurrency: "USD",
  destinationCurrency: "NGN",
  meta: { idempotencyKey: randomUUID(), reference: "test-failure-path" },
});

await afriex.transactions.simulate(transaction.transactionId, {
  outcome: "failed",
});
```

`simulate` takes `outcome: "success"` or `outcome: "failed"`. The transaction
must still be `PENDING`, `PROCESSING` or `UNKNOWN`; a finished one is answered
with `400`. A deposit waiting for an OTP has to be authorized first.

`simulate` returns the transaction as it stands before it is finalized. The
final status arrives through `TRANSACTION.UPDATED` a few seconds later, or on
the next `get`.

Without `simulate`, a transaction whose `meta.reference` contains
`SIMULATE_INSTANT` completes in about 30 seconds.

`simulate` is sandbox only. Production answers `403`.

## Choose an outcome with the account number

The last four digits of the bank account number, the mobile money phone number
or the card number decide what happens:

| Ends in       | Payout                           | Mobile money deposit             | Card deposit                     |
| ------------- | -------------------------------- | -------------------------------- | -------------------------------- |
| `0001`        | Fails; the balance is refunded   | Fails                            | Fails                            |
| `0002`        | Succeeds                         | Waits for a one-time password    | Succeeds                         |
| `0003`        | Stays pending until `simulate()` | Stays pending until `simulate()` | Stays pending until `simulate()` |
| `0004`        | The account name lookup fails    | Succeeds                         | Succeeds                         |
| `0005`        | Declined immediately             | Declined immediately             | Declined immediately             |
| anything else | Succeeds                         | Succeeds                         | Succeeds                         |

A phone number must still be valid for its country: keep the country prefix and
change only the last digits, for example `+254712340002` in Kenya. Account name
lookups return `Sandbox Test Account`.

## One-time passwords

A mobile money deposit from a wallet ending in `0002` is created
`CUSTOMER_ACTION_REQUIRED`. Complete it with `authorize` and the OTP `123456`.
Any other OTP is answered with `OTP_INCORRECT`.

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_SANDBOX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.transactions.authorize("txn_123", { type: "OTP", otp: "123456" });
```

## Related sandbox tools

| To                                   | Call                                  |
| ------------------------------------ | ------------------------------------- |
| Fund the sandbox balance             | `afriex.balance.topUpSandbox()`       |
| Pay into a sandbox virtual account   | `afriex.paymentMethods.simulateTransfer()` |
| Send yourself a sample webhook       | `afriex.webhooks.triggerTestWebhook()` |

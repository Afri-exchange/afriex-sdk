# @afriex/payment-batches

Payment batch service for the Afriex SDK. Save a list of recipients with the amount each one is paid, then pay all of them in one call.

## Installation

```bash
npm install @afriex/payment-batches @afriex/core
# or
pnpm add @afriex/payment-batches @afriex/core
```

## Usage

```typescript
import { AfriexClient } from "@afriex/core";
import { PaymentBatchService } from "@afriex/payment-batches";

const client = new AfriexClient({
  apiKey: "your-api-key",
});

const paymentBatches = new PaymentBatchService(client.getHttpClient());

// 1. Create an empty batch, funded from the USD wallet
const batch = await paymentBatches.create({
  name: "June payroll",
  sourcePaymentMethod: { currencyCode: "USD" },
});

// 2. Add the recipients
const added = await paymentBatches.addRecipients(batch.id, [
  {
    channel: "BANK_ACCOUNT",
    accountName: "Ada Obi",
    accountNumber: "0123456789",
    countryCode: "NG",
    institution: { institutionCode: "000013", institutionName: "GTBank" },
    amount: { value: "20000", currencyCode: "NGN" },
  },
  {
    channel: "MOBILE_MONEY",
    accountName: "Wanjiru Kamau",
    accountNumber: "254712345678",
    countryCode: "KE",
    institution: { institutionCode: "MPESA", institutionName: "M-Pesa" },
    amount: { value: "1000", currencyCode: "KES" },
  },
]);

console.log(added.successes, added.errors); // keyed by account number

// 3. Start the payouts
const run = await paymentBatches.withdraw(batch.id);

console.log(run.successes, run.errors); // keyed by recipientId

// 4. Retry only the payouts that failed
const sessions = await paymentBatches.listSessions(batch.id, { limit: 1 });

await paymentBatches.withdraw(batch.id, { sessionId: sessions.data[0].id });
```

Every payout is converted from the currency of the wallet the batch is funded from. The payouts settle asynchronously, so configure a webhook URL before you call `withdraw()` and follow each one through `TRANSACTION.UPDATED`.

## API Reference

### `create(request: PaymentBatchRequest): Promise<PaymentBatch>`

Create an empty batch.

**Endpoint:** `POST /payment-batch`

**Required:** `name`, `sourcePaymentMethod.currencyCode`

**Optional:** `sourcePaymentMethod.channel`. The only value is `WALLET`, which is also the default.

### `get(batchId: string): Promise<PaymentBatch>`

Get a batch by ID.

### `list(params?: PaymentBatchListParams): Promise<PaymentBatchListResponse>`

List batches. Pages start at `0`, and `limit` is between `1` and `100`.

**Returns:** `{ data, page, total }`. Each item carries `meta.memberCount`, the number of recipients in the batch.

### `update(batchId: string, request: PaymentBatchRequest): Promise<PaymentBatch>`

Replace the name and the funding method of a batch.

**Required:** `name`, `sourcePaymentMethod.currencyCode`. The batch is replaced whole, so send both even when only one changes.

### `delete(batchId: string): Promise<void>`

Delete a batch.

### `addRecipient(batchId: string, recipient: PaymentBatchRecipientRequest): Promise<SavedPaymentBatchRecipient>`

Add one recipient.

**Endpoint:** `POST /payment-batch/{batchId}/recipients`

**Required:** `channel`, `accountName`, `accountNumber`, `countryCode`, `amount.value`, `amount.currencyCode`, and `institution` for every channel except `UPI` and `INTERAC`

**Returns:** the saved account. Its `id` is the `paymentMethodId` of the recipient, not its `recipientId`.

### `addRecipients(batchId: string, recipients: PaymentBatchRecipientRequest[]): Promise<PaymentBatchOutcomes>`

Add several recipients. Each one is added independently, so the call succeeds even when some of them fail.

**Endpoint:** `POST /payment-batch/{batchId}/recipients/bulk`

**Returns:** `{ successes, errors }`, both keyed by account number. Check `errors` on every call.

### `listRecipients(batchId: string, params?: PaymentBatchListParams): Promise<PaymentBatchRecipientListResponse>`

List the recipients of a batch. Each one carries its `recipientId` and its `paymentMethodId`.

### `updateRecipient(batchId: string, recipientId: string, request: UpdatePaymentBatchRecipientRequest): Promise<SavedPaymentBatchRecipient>`

Replace the account details and the amount of a recipient.

**Required:** the same fields as `addRecipient()`. The recipient is replaced whole: a request that carries only the new amount is rejected.

**Optional:** `paymentMethodId`, to update the saved account in place.

### `removeRecipient(batchId: string, recipientId: string): Promise<void>`

Remove a recipient from the batch. The saved account is kept as a payment method.

### `withdraw(batchId: string, params?: WithdrawPaymentBatchParams): Promise<PaymentBatchOutcomes>`

Start the payouts for a batch.

**Endpoint:** `POST /payment-batch/{batchId}/withdraw`

**Optional:** `sessionId`, the id of an earlier run. Only the recipients that failed in that run are paid.

**Returns:** `{ successes, errors }`, both keyed by `recipientId`.

Every call without a `sessionId` is a new run and pays every recipient again. A call made while a run of the same batch is still in progress is refused with `409`.

### `listSessions(batchId: string, params?: PaymentBatchListParams): Promise<PaymentBatchSessionListResponse>`

List the runs of a batch. `meta.results` on each run holds the result for every recipient, keyed by `recipientId`.

## Key permissions

| Methods                                                                                   | Permission                    |
| ----------------------------------------------------------------------------------------- | ----------------------------- |
| `list`, `get`, `listRecipients`                                                           | `PAYMENT_METHOD.READ`         |
| `create`, `update`, `delete`, `addRecipient`, `addRecipients`, `updateRecipient`, `removeRecipient` | `PAYMENT_METHOD.CREATE`       |
| `withdraw`                                                                                | `TRANSACTION.WITHDRAW.CREATE` |
| `listSessions`                                                                            | `TRANSACTION.HISTORY.READ`    |

A key without the permission is answered with `401`.

## License

MIT

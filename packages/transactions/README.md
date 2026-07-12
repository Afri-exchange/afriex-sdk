# @afriex/transactions

Transaction service for the Afriex SDK. Create and track international money transfers.

## Installation

```bash
npm install @afriex/transactions @afriex/core
# or
pnpm add @afriex/transactions @afriex/core
```

## Usage

```typescript
import { AfriexClient } from "@afriex/core";
import { TransactionService } from "@afriex/transactions";

const client = new AfriexClient({
  apiKey: "your-api-key",
});

const transactions = new TransactionService(client.getHttpClient());

// Create a transaction
const tx = await transactions.create({
  customerId: "customer-id",
  sourceAmount: "100",
  destinationAmount: "50000",
  sourceCurrency: "USD",
  destinationCurrency: "NGN",
  destinationId: "payment-method-id",
  meta: {
    idempotencyKey: "txn-quick-start-1",
    reference: "order-123",
  },
});

// Create a SWAP transaction against the business wallet
const swap = await transactions.create({
  type: "SWAP",
  sourceAmount: "100",
  sourceCurrency: "USD",
  destinationCurrency: "NGN",
  meta: {
    idempotencyKey: "swap-quick-start-1",
    reference: "swap-order-123",
  },
});

// Get a transaction by ID
const fetchedTx = await transactions.get("transaction-id");

// List transactions with pagination
const { data, page, total } = await transactions.list({
  limit: 10,
  page: 1,
});

// Authorize a deposit left in CUSTOMER_ACTION_REQUIRED (e.g. mobile-money OTP)
const authorized = await transactions.authorize("transaction-id", {
  type: "OTP",
  otp: "123456",
});
```

## API Reference

### `create(request: CreateTransactionRequest): Promise<Transaction>`

Create a new transaction.

**WITHDRAW required fields:** `customerId`, `sourceCurrency`, `destinationCurrency`, `destinationId`, `meta`, and exactly one of `sourceAmount`/`destinationAmount`

**DEPOSIT required fields:** `customerId`, `sourceAmount`, `destinationAmount`, `sourceCurrency`, `destinationCurrency`, `sourceId`, `meta`

**SWAP required fields:** `sourceCurrency`, `destinationCurrency`, `meta`, and exactly one of `sourceAmount`/`destinationAmount`

**Optional fields:** `customerId`, `meta.narration`, `meta.invoice`, `shouldPreferSourceAmount` (opt in to deriving `destinationAmount` from `sourceAmount` via the forward rate even when both amounts are sent; defaults to `false`, which keeps destination-wins semantics)

### `get(transactionId: string): Promise<Transaction>`

Retrieve a transaction by ID. The response may include `channel`, `merchantReference`, `rate`, and `meta.otpRequired`/`meta.failureReason` in addition to the fields sent on create.

### `list(params?: ListTransactionsParams): Promise<TransactionListResponse>`

List transactions with optional pagination and filters.

**Parameters:** `page`, `limit`, `transactionId`, `reference`, `status`, `type`, `channel`, `currency`, `fromDate`, `toDate`

**Returns:** `{ data: Transaction[], page: number, total: number }`

### `authorize(transactionId: string, request: AuthorizeTransactionRequest): Promise<Transaction>`

Complete a transaction that was created in a `CUSTOMER_ACTION_REQUIRED` state and needs an extra authorization step, such as an OTP on a mobile-money deposit (`meta.otpRequired: true`). Today the only supported variant is `{ type: "OTP", otp: string }`.

## Transaction Status Values

- `PENDING` - Transaction initiated
- `PROCESSING` - Transaction in progress
- `SUCCESS` - Transaction successful
- `FAILED` - Transaction failed
- `CANCELLED` - Transaction cancelled
- `REFUNDED` - Transaction refunded
- `RETRY` - Transaction will be retried
- `UNKNOWN` - Unknown status
- `SCHEDULED` - Transaction is scheduled for later processing
- `CUSTOMER_ACTION_REQUIRED` - Awaiting customer action (see `authorize()`)
- `REJECTED` - Transaction rejected
- `IN_REVIEW` - Transaction under review
- `DISPUTED` - Transaction is disputed
- `DISPUTE_RESOLVED` - Dispute has been resolved
- `DISPUTE_WON` - Dispute resolved in your favor
- `DISPUTE_LOST` - Dispute resolved against you
- `DISPUTE_EVIDENCE_SUBMITTED` - Dispute evidence submitted

## Failure Reasons

When `status` is `FAILED` or `REJECTED`, `meta.failureReason` carries a stable Afriex-side `code` (`AFX_*`), a customer-safe `message`, and a `retryable` boolean — safe to switch on without depending on which payment rail was used.

## License

MIT

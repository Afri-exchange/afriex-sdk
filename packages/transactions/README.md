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
```

## API Reference

### `create(request: CreateTransactionRequest): Promise<Transaction>`

Create a new transaction.

**WITHDRAW required fields:** `customerId`, `sourceAmount`, `destinationAmount`, `sourceCurrency`, `destinationCurrency`, `destinationId`, `meta`

**DEPOSIT required fields:** `customerId`, `sourceAmount`, `destinationAmount`, `sourceCurrency`, `destinationCurrency`, `sourceId`, `meta`

**SWAP required fields:** `sourceAmount`, `sourceCurrency`, `destinationCurrency`, `meta`

**Optional fields:** `customerId`, `destinationAmount`, `meta.narration`, `meta.invoice`, `meta.merchantId`

### `get(transactionId: string): Promise<Transaction>`

Retrieve a transaction by ID.

### `list(params?: ListTransactionsParams): Promise<TransactionListResponse>`

List transactions with optional pagination and filters.

**Parameters:** `page`, `limit`, `transactionId`, `reference`, `status`, `type`, `channel`, `currency`, `fromDate`, `toDate`

**Returns:** `{ data: Transaction[], page: number, total: number }`

## Transaction Status Values

- `PENDING` - Transaction initiated
- `PROCESSING` - Transaction in progress
- `COMPLETED` - Transaction successful
- `SUCCESS` - Transaction successful
- `FAILED` - Transaction failed
- `CANCELLED` - Transaction cancelled
- `REFUNDED` - Transaction refunded
- `RETRY` - Transaction will be retried
- `SCHEDULED` - Transaction is scheduled for later processing
- `CUSTOMER_ACTION_REQUIRED` - Awaiting customer action
- `REJECTED` - Transaction rejected
- `IN_REVIEW` - Transaction under review
- `DISPUTED` - Transaction is disputed
- `DISPUTE_RESOLVED` - Dispute has been resolved
- `DISPUTE_WON` - Dispute resolved in your favor
- `DISPUTE_LOST` - Dispute resolved against you
- `DISPUTE_EVIDENCE_SUBMITTED` - Dispute evidence submitted
- `UNKNOWN` - Unknown status

## License

MIT

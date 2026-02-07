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
import { AfriexClient } from '@afriex/core';
import { TransactionService } from '@afriex/transactions';

const client = new AfriexClient({
    apiKey: 'your-api-key'
});

const transactions = new TransactionService(client.getHttpClient());

// Create a transaction
const tx = await transactions.create({
    customerId: 'customer-id',
    destinationAmount: 50000,
    sourceCurrency: 'USD',
    destinationCurrency: 'NGN',
    destinationId: 'payment-method-id'
});

// Get a transaction by ID
const fetchedTx = await transactions.get('transaction-id');

// List transactions with pagination
const { data, page, total } = await transactions.list({
    limit: 10,
    page: 1
});
```

## API Reference

### `create(request: CreateTransactionRequest): Promise<Transaction>`
Create a new transaction.

**Required fields:** `customerId`, `destinationAmount`, `sourceCurrency`, `destinationCurrency`, `destinationId`

**Optional fields:** `meta` (narration, invoice, idempotencyKey, merchantId)

### `get(transactionId: string): Promise<Transaction>`
Retrieve a transaction by ID.

### `list(params?: ListTransactionsParams): Promise<TransactionListResponse>`
List transactions with optional pagination.

**Parameters:** `page`, `limit`

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
- `REJECTED` - Transaction rejected
- `IN_REVIEW` - Transaction under review
- `UNKNOWN` - Unknown status

## License

MIT

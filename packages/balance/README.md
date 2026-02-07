# @afriex/balance

Balance service for the Afriex SDK. Query organization wallet balances.

## Installation

```bash
npm install @afriex/balance @afriex/core
# or
pnpm add @afriex/balance @afriex/core
```

## Usage

```typescript
import { AfriexClient } from '@afriex/core';
import { BalanceService } from '@afriex/balance';

const client = new AfriexClient({
    apiKey: 'your-api-key'
});

const balance = new BalanceService(client.getHttpClient());

// Get balances for specific currencies (required)
const balances = await balance.getBalance({ 
    currencies: ['USD', 'NGN'] 
});
// Returns: { USD: 1000.50, NGN: 500000.00 }

// Get balances with comma-separated string
const balances = await balance.getBalance({ 
    currencies: 'USD,NGN,GHS' 
});

// Get balance for a single currency
const usdBalance = await balance.getBalanceForCurrency('USD');
// Returns: 1000.50 (number)
```

## API Reference

### `getBalance(params: GetBalanceParams): Promise<Record<string, number>>`
Get balances for specified currencies.

**Endpoint:** `GET /api/v1/org/balance`

**Parameters:**
- `currencies` (required): Array of currency codes or comma-separated string

**Returns:** `Record<string, number>` - Currency code to balance mapping

### `getBalanceForCurrency(currency: string): Promise<number>`
Get balance for a single currency.

**Parameters:**
- `currency`: Currency code (e.g., `'USD'`, `'NGN'`)

**Returns:** `number` - Balance amount (returns 0 if currency not found)

## License

MIT

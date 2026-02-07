# @afriex/rates

Exchange rate service for the Afriex SDK. Get real-time exchange rates and perform currency conversions.

## Installation

```bash
npm install @afriex/rates @afriex/core
# or
pnpm add @afriex/rates @afriex/core
```

## Usage

```typescript
import { AfriexClient } from '@afriex/core';
import { RateService } from '@afriex/rates';

const client = new AfriexClient({
    apiKey: 'your-api-key'
});

const rates = new RateService(client.getHttpClient());

// Get rates for specific currencies (required)
const response = await rates.getRates({
    base: ['USD', 'GBP'],
    symbols: ['NGN', 'KES', 'GHS']
});
// Returns: { rates: { USD: { NGN: '1550.00', ... }, ... }, base: [...], updatedAt: ... }

// Get rates with comma-separated strings
const response = await rates.getRates({
    base: 'USD,GBP',
    symbols: 'NGN,KES'
});

// Get a single rate
const rate = await rates.getRate('USD', 'NGN');
// Returns: '1550.00' (string)

// Convert an amount
const result = await rates.convert(100, 'USD', 'NGN');
// Returns: 155000 (number)
```

## API Reference

### `getRates(params: GetRatesParams): Promise<RatesResponse>`
Get exchange rates.

**Endpoint:** `GET /v2/public/rates`

**Parameters:**
- `base` (required): Base currency or array of currencies
- `symbols` (required): Target currency or array of currencies

**Returns:** `RatesResponse` with nested rate maps

### `getRate(baseCurrency: string, targetCurrency: string): Promise<string>`
Get a single exchange rate.

**Returns:** Exchange rate as string (returns `'0'` if not found)

### `convert(amount: number, baseCurrency: string, targetCurrency: string): Promise<number>`
Convert an amount between currencies.

**Throws:** `ValidationError` if amount is <= 0

## License

MIT

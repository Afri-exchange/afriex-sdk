# @afriex/sdk

Official TypeScript SDK for the Afriex Business API. A unified interface for all Afriex services.

## Installation

```bash
npm install @afriex/sdk
# or
pnpm add @afriex/sdk
```

## Quick Start

```typescript
import { AfriexSDK } from '@afriex/sdk';
// or use the alias
import { Afriex } from '@afriex/sdk';

const afriex = new AfriexSDK({
    apiKey: 'your-api-key',
    environment: 'production', // or 'staging' (default: 'production')
    webhookPublicKey: '-----BEGIN PUBLIC KEY-----...' // optional
});

// Customers
const customer = await afriex.customers.create({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    countryCode: 'US'
});

// Payment Methods
const paymentMethod = await afriex.paymentMethods.create({
    customerId: customer.customerId,
    channel: 'BANK_ACCOUNT',
    accountName: 'John Doe',
    accountNumber: '1234567890',
    countryCode: 'NG',
    institution: {
        institutionCode: '058',
        institutionName: 'GTBank'
    }
});

// Transactions
const transaction = await afriex.transactions.create({
    customerId: customer.customerId,
    destinationAmount: 50000,
    sourceCurrency: 'USD',
    destinationCurrency: 'NGN',
    destinationId: paymentMethod.paymentMethodId
});

// Rates
const rate = await afriex.rates.getRate('USD', 'NGN');

// Balance
const balances = await afriex.balance.getBalance({ currencies: ['USD', 'NGN'] });

// Webhook Verification (only if webhookPublicKey provided)
if (afriex.webhooks) {
    const isValid = afriex.webhooks.verify(payload, signature);
}
```

## Available Services

| Service                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `afriex.customers`      | Customer CRUD and KYC management             |
| `afriex.transactions`   | Create and track transactions                |
| `afriex.paymentMethods` | Bank, mobile money, crypto, virtual accounts |
| `afriex.balance`        | Organization wallet balances                 |
| `afriex.rates`          | Exchange rates and conversions               |
| `afriex.webhooks`       | Webhook signature verification (optional)    |

## Configuration

```typescript
interface AfriexSDKConfig {
    apiKey: string;           // Required - Your Afriex API key
    environment?: 'staging' | 'production';  // Default: 'production'
    webhookPublicKey?: string; // Optional - Afriex's public key for webhooks
}
```

## Individual Packages

For smaller bundle sizes, install packages individually:

| Package                   | Description                   |
| ------------------------- | ----------------------------- |
| `@afriex/core`            | Base client and configuration |
| `@afriex/customers`       | Customer management           |
| `@afriex/transactions`    | Transaction handling          |
| `@afriex/payment-methods` | Payment methods               |
| `@afriex/balance`         | Balance queries               |
| `@afriex/rates`           | Exchange rates                |
| `@afriex/webhooks`        | Webhook verification          |

## Documentation

Full documentation available at [afriex-sdk-docs.vercel.app](https://afriex-sdk-docs.vercel.app)

## License

MIT

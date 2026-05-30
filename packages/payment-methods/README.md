# @afriex/payment-methods

Payment method service for the Afriex SDK. Manage bank accounts, mobile money, crypto wallets, and virtual accounts.

## Installation

```bash
npm install @afriex/payment-methods @afriex/core
# or
pnpm add @afriex/payment-methods @afriex/core
```

## Usage

```typescript
import { AfriexClient } from "@afriex/core";
import { PaymentMethodService } from "@afriex/payment-methods";

const client = new AfriexClient({
  apiKey: "your-api-key",
});

const paymentMethods = new PaymentMethodService(client.getHttpClient());

// Create a payment method
const method = await paymentMethods.create({
  customerId: "customer-id",
  channel: "BANK_ACCOUNT",
  accountName: "John Doe",
  accountNumber: "1234567890",
  countryCode: "NG",
  institution: {
    institutionCode: "058",
    institutionName: "GTBank",
  },
});

// Get a payment method by ID
const fetchedMethod = await paymentMethods.get("payment-method-id");

// List payment methods with pagination
const { data, page, total } = await paymentMethods.list({
  page: 1,
  limit: 10,
});

// Delete a payment method
await paymentMethods.delete("payment-method-id");

// Get supported institutions
const banks = await paymentMethods.getInstitutions({
  channel: "BANK_ACCOUNT",
  countryCode: "NG",
});

// Resolve account details
const account = await paymentMethods.resolveAccount({
  channel: "BANK_ACCOUNT",
  countryCode: "NG",
  accountNumber: "1234567890",
  institutionCode: "058",
});

// Get crypto wallet (production only)
const wallet = await paymentMethods.getCryptoWallet({
  asset: "USDT", // or 'USDC'
});

// List virtual accounts (production only)
const virtualAccounts = await paymentMethods.listVirtualAccounts({
  currency: "NGN",
  customerId: "customer-id",
});

// Create a virtual account (production only)
const virtualAccount = await paymentMethods.createVirtualAccount({
  currency: "NGN",
  label: "SALES",
  customerId: "customer-id",
});

// Get the pool account for a country (production only)
const poolAccount = await paymentMethods.listPoolAccounts({
  country: "NG",
});
```

## Payment Channels

- `BANK_ACCOUNT` - Bank account
- `SWIFT` - SWIFT transfer
- `MOBILE_MONEY` - Mobile money wallet
- `UPI` - UPI transfer (India)
- `INTERAC` - Interac transfer (Canada)
- `WE_CHAT` - WeChat Pay

## API Reference

### `create(request: CreatePaymentMethodRequest): Promise<PaymentMethod>`

Create a new payment method.

**Required fields:** `customerId`, `channel`, `accountName`, `accountNumber`, `countryCode`, `institution`

**Optional fields:** `recipient`, `transaction`

### `get(paymentMethodId: string): Promise<PaymentMethod>`

Retrieve a payment method by ID.

### `list(params?: ListPaymentMethodsParams): Promise<PaymentMethodListResponse>`

List payment methods with optional pagination.

**Parameters:** `page`, `limit`

**Returns:** `{ data: PaymentMethod[], page: number, total: number }`

### `delete(paymentMethodId: string): Promise<void>`

Delete a payment method.

### `getInstitutions(params: GetInstitutionsParams): Promise<Institution[]>`

Get supported financial institutions.

**Required:** `channel`, `countryCode`

### `resolveInstitutionCode(params: InstitutionCodesParams): Promise<InstitutionCodesResponse|null>`

Resolve a bank code (SWIFT or US routing number) to the corresponding bank or institution

**Required:** `codeType`, `searchTerm`, and `country`

### `resolveAccount(params: ResolveAccountParams): Promise<ResolveAccountResponse>`

Resolve and verify account details.

**Required:** `channel` (`MOBILE_MONEY` or `BANK_ACCOUNT`), `countryCode`, `accountNumber`

**Required for bank accounts:** `institutionCode`

### `getCryptoWallet(params: GetCryptoWalletParams): Promise<CryptoWalletResponse>`

Get crypto wallet address. **Production only.**

**Required:** `asset` (`USDT` or `USDC`)

**Optional:** `customerId`

### `listVirtualAccounts(params: ListVirtualAccountsParams): Promise<VirtualAccountListResponse>`

List existing virtual accounts. **Production only.**

**Required:** `currency`

**Optional:** `customerId`, `reference`

### `createVirtualAccount(params: CreateVirtualAccountParams): Promise<PaymentMethod>`

Create a virtual account. **Production only.**

**Required:** `currency`

**Optional:** `customerId`, `country`, `label`, `amount`, `reference`

**Constraint:** `label` and `amount` are mutually exclusive

### `listPoolAccounts(params: ListPoolAccountsParams): Promise<PaymentMethod>`

Get the pool account for a country. **Production only.**

**Required:** `country`

**Optional:** `customerId`

## License

MIT

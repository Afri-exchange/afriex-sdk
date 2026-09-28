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

// List payment methods with pagination and filters
const { data, page, total } = await paymentMethods.list({
  page: 0, // pages start at 0
  limit: 10,
  channel: ["BANK_ACCOUNT", "MOBILE_MONEY"],
  currencies: ["USD", "NGN"],
  status: ["active", "pending"],
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

// Get crypto wallet (documented as production only)
const wallet = await paymentMethods.getCryptoWallet({
  asset: "USDT", // or 'USDC'
});

// List virtual accounts
const virtualAccounts = await paymentMethods.listVirtualAccounts({
  currency: "NGN",
  customerId: "customer-id",
});

// Create a virtual account. The result is null when the bank opens the
// account later; it then arrives by the PAYMENT_METHOD.CREATED webhook.
const virtualAccount = await paymentMethods.createVirtualAccount({
  currency: "NGN",
  label: "SALES",
  customerId: "customer-id",
});

// Get the pool account for a country
const poolAccount = await paymentMethods.getPoolAccount({
  country: "NG",
});
```

## Payment Channels

**Creatable via `create()`:**

- `BANK_ACCOUNT` - Bank account
- `MOBILE_MONEY` - Mobile money wallet
- `VIRTUAL_BANK_ACCOUNT` - Virtual bank account
- `ACH_BANK_ACCOUNT` - US ACH bank account
- `INTERAC` - Interac transfer (Canada)
- `UPI` - UPI transfer (India)
- `SWIFT` - SWIFT transfer
- `WE_CHAT` - WeChat Pay, and Alipay

Alipay has no channel of its own. Create it on `WE_CHAT` with `institution.institutionCode` and `institutionName` both set to `ALIPAY`.

**Response-only** (returned by `get()`/`list()`, never accepted on create): `ALIPAY`, `CARD`, `CRYPTO`, `PAYBILL_TILL`, `POOL_ACCOUNT`, `RFP`, `VIRTUAL_CARD`

## API Reference

### `create(request: CreatePaymentMethodRequest): Promise<PaymentMethod>`

Create a new payment method.

**Always required:** `customerId`, `channel`, `countryCode`

**Required by channel:**

| Channel | `accountName` | `accountNumber` | `institution` |
| :-- | :-- | :-- | :-- |
| `BANK_ACCOUNT`, `MOBILE_MONEY`, `SWIFT`, `ACH_BANK_ACCOUNT`, `WE_CHAT` | Required | Required | Required |
| `UPI`, `INTERAC` | Required | Required | Not needed |
| `VIRTUAL_BANK_ACCOUNT` | Not needed | Not needed | Not needed |

For `MOBILE_MONEY`, send `accountNumber` as digits only (country code plus national number). A leading `+` is rejected.

**Optional fields:** `type`, `recipient`, `transaction`

### `get(paymentMethodId: string): Promise<PaymentMethod>`

Retrieve a payment method by ID.

### `list(params?: ListPaymentMethodsParams): Promise<PaymentMethodListResponse>`

List payment methods with optional pagination and filters.

**Parameters:** `page` (starts at 0), `limit` (max 100), `channel`, `currencies`, `capabilities` (only `WITHDRAW`, the default), `status` (`active` or `pending`; defaults to both)

`channel` accepts `BANK_ACCOUNT`, `MOBILE_MONEY`, `INTERAC`, `UPI`, `WE_CHAT`, `VIRTUAL_BANK_ACCOUNT`, `RFP` and `SWIFT`. Any other filter value answers `422`.

**Returns:** `{ data: PaymentMethod[], page: number, total: number }`

### `delete(paymentMethodId: string): Promise<void>`

Delete a payment method.

### `getInstitutions(params: GetInstitutionsParams): Promise<InstitutionListResponse>`

Get supported financial institutions. The list is on `.data`.

**Required:** `channel` (`BANK_ACCOUNT`, `SWIFT`, `MOBILE_MONEY` or `ACH_BANK_ACCOUNT`), `countryCode`

Any other channel answers `400 INVALID_TRANSACTION_CHANNEL`.

### `resolveInstitutionCode(params: InstitutionCodesParams): Promise<InstitutionCodesResponse>`

Resolve a bank code (SWIFT or US routing number) to the corresponding bank or institution. The name is at `.data.bankName`; `.data` is `null` when the code does not resolve.

**Required:** `codeType`, `searchTerm`, and `country`

`country` defaults to `US` and accepts any ISO country code for `swift_code` lookups; `routing_number` is only supported when `country` is `US`.

### `resolveAccount(params: ResolveAccountParams): Promise<ResolveAccountResponse>`

Resolve and verify account details.

**Required:** `channel` (`MOBILE_MONEY` or `BANK_ACCOUNT`), `countryCode`, `accountNumber`, `institutionCode`

`institutionCode` is the bank code for `BANK_ACCOUNT` and the provider code for `MOBILE_MONEY`. The API rejects a request without it on either channel.

**Returns:** `{ data: { recipientName, institutionName, institutionCode } }`

### `getCryptoWallet(params: GetCryptoWalletParams): Promise<CryptoWalletResponse>`

Get or create a crypto wallet. It returns one wallet with an address per network, at `.data.addresses`. The API reference documents it as production only.

**Required:** `asset` (`USDT` or `USDC`)

**Optional:** `customerId`

### `listVirtualAccounts(params: ListVirtualAccountsParams): Promise<VirtualAccountListResponse>`

List existing virtual accounts. Read-only: it returns an empty list when there is none and never creates one.

**Required:** `currency`

**Optional:** `customerId`, `country`, `amount`, `reference`

### `createVirtualAccount(params: CreateVirtualAccountParams): Promise<PaymentMethod | null>`

Create a virtual account.

**Required:** `currency`

**Optional:** `customerId`, `label`, `amount`

**Constraint:** `label` and `amount` are mutually exclusive. `label` makes a permanent account and is one of `SALES`, `OPERATIONS`, `PAYROLL`, `COLLECTIONS`, `VENDOR_PAYMENTS`, `TAX`, `REFUNDS`, `MARKETING`, `TREASURY`, `GENERAL`. `amount` makes a one-time account that expires.

A virtual account for a customer can only be `NGN`. Omit `customerId` to create one in another currency for the business.

**Returns:** the account, or `null` when the issuing bank opens it after the request returns. It then arrives through the `PAYMENT_METHOD.CREATED` webhook.

### `getPoolAccount(params: ListPoolAccountsParams): Promise<PaymentMethod>`

Get the pool account for a country. Use its `reference` to reconcile incoming deposits. Every call also sends a `PAYMENT_METHOD.UPDATED` webhook.

**Required:** `country`

**Optional:** `customerId`

`listPoolAccounts()` is the deprecated name for the same call.

## License

MIT

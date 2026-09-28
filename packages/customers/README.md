# @afriex/customers

Customer management service for the Afriex SDK. Create, retrieve, list, delete customers and manage KYC.

## Installation

```bash
npm install @afriex/customers @afriex/core
# or
pnpm add @afriex/customers @afriex/core
```

## Usage

```typescript
import { AfriexClient } from "@afriex/core";
import { CustomerService } from "@afriex/customers";

const client = new AfriexClient({
  apiKey: "your-api-key",
});

const customers = new CustomerService(client.getHttpClient());

// Create a customer
const customer = await customers.create({
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  countryCode: "US",
});

// Get a customer by ID
const fetchedCustomer = await customers.get("customer-id");

// List customers with pagination and filters
const { data, page, total } = await customers.list({
  limit: 10,
  page: 0,
  email: "john@example.com",
  phone: "+1234567890",
});

// Delete a customer
await customers.delete("customer-id");

// Partially update a customer's profile
const updated = await customers.update("customer-id", {
  fullName: "Jane Doe",
});

// Update KYC information — the document map is sent directly,
// not wrapped in a `kyc` field. Each call replaces the stored documents.
const withKyc = await customers.updateKyc("customer-id", {
  PASSPORT: "AB123456",
  DATE_OF_BIRTH: "1990-05-15",
});

// Verify a customer document (currently BVN only)
const verified = await customers.verify("customer-id", {
  docType: "BVN",
  docValue: "22222222222",
});
```

## API Reference

### `create(request: CreateCustomerRequest): Promise<Customer>`

Create a new customer.

**Required fields:** `fullName`, `email`, `phone`, `countryCode`

**Optional fields:** `meta`

### `get(customerId: string): Promise<Customer>`

Retrieve a customer by ID. The response uses `name`, not `fullName`, and carries `reference`: the value to supply as the pool-account reference on a payment proof.

### `list(params?: ListCustomersParams): Promise<CustomerListResponse>`

List all customers with optional pagination and filters.

**Parameters:** `page` (starts at 0), `limit` (max 100), `email`, `phone`

**Returns:** `{ data: Customer[], page: number, total: number }`

### `update(customerId: string, request: UpdateCustomerRequest): Promise<Customer>`

Partially update a customer's profile.

**At least one required:** `fullName`, `email`, `phone` — omitted fields are left unchanged.

### `delete(customerId: string): Promise<void>`

Delete a customer.

### `updateKyc(customerId: string, request: UpdateCustomerKycRequest): Promise<Customer>`

Update customer KYC information. `UpdateCustomerKycRequest` is a flat map of KYC document types to values, sent directly as the request body (not wrapped in a `kyc` field). Valid keys: `REPRESENTATIVE_TYPE`, `DATE_OF_BIRTH`, `ADDRESS`, `BANK_STATEMENT`, `BUSINESS_CERTIFICATE`, `ID_FRONT`, `ID_BACK`, `SELFIE`, `PROOF_OF_ADDRESS`, `PROOF_OF_INCOME`, `DRIVER_LICENSE`, `PASSPORT`, `NATIONAL_ID`, `PAYMENT_METHOD`, `RESIDENCE_PERMIT`, `VEHICLE_REGISTRATION`, `VOTER_ID`, `OTHERS`.

`COUNTRY`, `PHONE` and `BVN` are not accepted: the API answers `400 INVALID_KYC_DOCUMENT_TYPE`, and `updateKyc()` throws a `ValidationError` before sending. Change a phone number with `update()` and submit a BVN with `verify()`.

The endpoint is documented as a partial update, but each call replaces the stored documents. Send every document you want to keep. The saved documents come back at `meta.kyc.data`.

### `verify(customerId: string, request: VerifyCustomerRequest): Promise<Customer>`

Run an identity verification against a customer document. Today the only supported `docType` is `BVN` (Nigeria); `docValue` is the document number. Rate limited per business.

## License

MIT

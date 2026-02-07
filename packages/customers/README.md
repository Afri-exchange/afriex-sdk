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
import { AfriexClient } from '@afriex/core';
import { CustomerService } from '@afriex/customers';

const client = new AfriexClient({
    apiKey: 'your-api-key'
});

const customers = new CustomerService(client.getHttpClient());

// Create a customer
const customer = await customers.create({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    countryCode: 'US'
});

// Get a customer by ID
const fetchedCustomer = await customers.get('customer-id');

// List customers with pagination
const { data, page, total } = await customers.list({ 
    limit: 10,
    page: 1 
});

// Delete a customer
await customers.delete('customer-id');

// Update KYC information
const updated = await customers.updateKyc('customer-id', {
    kyc: {
        documentType: 'passport',
        documentNumber: 'AB123456'
    }
});
```

## API Reference

### `create(request: CreateCustomerRequest): Promise<Customer>`
Create a new customer.

**Required fields:** `fullName`, `email`, `phone`, `countryCode`

**Optional fields:** `kyc`, `meta`

### `get(customerId: string): Promise<Customer>`
Retrieve a customer by ID.

### `list(params?: ListCustomersParams): Promise<CustomerListResponse>`
List all customers with optional pagination.

**Parameters:** `page`, `limit`

**Returns:** `{ data: Customer[], page: number, total: number }`

### `delete(customerId: string): Promise<void>`
Delete a customer.

### `updateKyc(customerId: string, request: UpdateCustomerKycRequest): Promise<Customer>`
Update customer KYC information.

**Required:** `kyc` object with key-value pairs

## License

MIT

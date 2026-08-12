---
name: afriex-customers
description: >
  Manage Afriex Business API customers with @afriex/customers CustomerService —
  create, get, list, update, delete, updateKyc, and verify. Covers the
  CreateCustomerRequest fullName/email/phone/countryCode shape, the flat KYC
  document map on PATCH /customer/{id}/kyc, BVN verification, and the
  page/total list envelope. Load when registering senders or recipients,
  submitting or updating KYC documents, verifying a Nigerian BVN, or paginating
  customers.
metadata:
  type: core
  library: '@afriex/customers'
  library_version: '2.0.1'
sources:
  - 'Afri-exchange/afriex-sdk:packages/customers/src/CustomerService.ts'
  - 'Afri-exchange/afriex-sdk:packages/customers/src/types.ts'
---

# Afriex Customers

`CustomerService` maps to the `/customer` endpoints of the Afriex Business
API. A customer is the party a transaction is attributed to; payment methods
and transactions both reference a `customerId`.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const customer = await afriex.customers.create({
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+2348012345678",
  countryCode: "NG",
});

console.log(customer.customerId, customer.name);
```

`fullName`, `email`, `phone`, and `countryCode` are all required — the service
raises a `ValidationError` before sending the request if any is missing.

## Core Patterns

### Update a profile, then attach KYC documents

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

await afriex.customers.update("cus_123", { email: "ada.new@example.com" });

await afriex.customers.updateKyc("cus_123", {
  BVN: "22212345678",
  NIN: "12345678901",
});
```

`update` is a PATCH — omitted fields are left unchanged, and at least one of
`fullName`, `email`, or `phone` must be present. `updateKyc` takes a flat map
of document type to value and sends it as the whole request body.

### Verify a Nigerian BVN

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const verified = await afriex.customers.verify("cus_123", {
  docType: "BVN",
  docValue: "22212345678",
});

console.log(verified.kyc);
```

`BVN` is the only `docType` the endpoint accepts today.

### Page through every customer

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";
import type { Customer } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

async function listAllCustomers(): Promise<Customer[]> {
  const all: Customer[] = [];
  let page = 1;

  for (;;) {
    const response = await afriex.customers.list({ page, limit: 100 });
    all.push(...response.data);
    if (all.length >= response.total || response.data.length === 0) {
      return all;
    }
    page += 1;
  }
}

console.log((await listAllCustomers()).length);
```

### Look a customer up by email before creating a duplicate

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const existing = await afriex.customers.list({ email: "ada@example.com", limit: 1 });

const customer =
  existing.data[0] ??
  (await afriex.customers.create({
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348012345678",
    countryCode: "NG",
  }));

console.log(customer.customerId);
```

## Common Mistakes

### HIGH Reading fullName off the returned Customer

Wrong:

```ts
import type { Customer } from "@afriex/sdk";

function greet(customer: Customer): string {
  return `Hello ${(customer as unknown as { fullName: string }).fullName}`;
}
```

Correct:

```ts
import type { Customer } from "@afriex/sdk";

function greet(customer: Customer): string {
  return `Hello ${customer.name}`;
}
```

`CreateCustomerRequest` sends `fullName` but the `Customer` resource returns
the same value as `name`, so the request field name does not round-trip and
the greeting renders `Hello undefined`.

Source: packages/customers/src/types.ts (`Customer.name` vs `CreateCustomerRequest.fullName`)

### HIGH Wrapping KYC documents in a kyc field

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.customers.updateKyc("cus_123", {
  kyc: JSON.stringify({ BVN: "22212345678" }),
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.customers.updateKyc("cus_123", { BVN: "22212345678" });
```

`UpdateCustomerKycRequest` is `Record<string, string>` posted verbatim as the
body, so a `kyc` wrapper is stored as a document literally named `kyc` and the
real BVN is never recorded.

Source: packages/customers/src/CustomerService.ts (`updateKyc`)

### HIGH Treating the list response as a paginated envelope

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

let page = 1;
let response = await afriex.customers.list({ page });
while ((response as unknown as { pagination?: { hasMore: boolean } }).pagination?.hasMore) {
  page += 1;
  response = await afriex.customers.list({ page });
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";
import type { Customer } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const all: Customer[] = [];
let page = 1;
for (;;) {
  const response = await afriex.customers.list({ page, limit: 100 });
  all.push(...response.data);
  if (all.length >= response.total || response.data.length === 0) break;
  page += 1;
}
```

`CustomerListResponse` is `{ data, page, total }` — it has no `pagination`
object and no `hasMore` flag, so the loop condition is `undefined` and only the
first page is ever fetched.

Source: packages/customers/src/types.ts (`CustomerListResponse`)

### MEDIUM Calling update with only meta or an empty patch

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.customers.update("cus_123", {});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.customers.update("cus_123", { phone: "+2348090000000" });
```

`update` runs `requireOneOf(["fullName", "email", "phone"])` client-side and
throws a `ValidationError` before any HTTP call, so an empty or metadata-only
patch never reaches the API.

Source: packages/customers/src/CustomerService.ts (`update`)

### MEDIUM Passing a non-BVN document type to verify

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.customers.updateKyc("cus_123", { NIN: "12345678901" });
await afriex.customers.verify("cus_123", {
  docType: "NIN" as "BVN",
  docValue: "12345678901",
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.customers.updateKyc("cus_123", { NIN: "12345678901" });
await afriex.customers.verify("cus_123", {
  docType: "BVN",
  docValue: "22212345678",
});
```

`VerifyCustomerRequest.docType` is the literal `"BVN"`; other document types
are stored through `updateKyc` but cannot be actively verified, so a cast
produces a rejected request instead of a verified customer.

Source: packages/customers/src/types.ts (`VerifyCustomerRequest`)

See also: afriex-payment-methods/SKILL.md — payment methods are created
against a `customerId` produced here.

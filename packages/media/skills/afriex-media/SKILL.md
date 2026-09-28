---
name: afriex-media
description: >
  Upload files to Afriex with @afriex/media MediaService — upload to send a
  file in one call, createUploadUrl for the presigned URL, key and expiresIn.
  Covers the transaction and user upload types, which requests take the
  returned key (meta.invoice on a SWIFT withdrawal, fileKey on a pool-account
  payment proof, document fields), and why the presigned URL is never sent to
  the API. Load when attaching an invoice, a payment proof or an identity
  document to an Afriex request.
metadata:
  type: core
  library: '@afriex/media'
  library_version: '1.0.0'
sources:
  - 'Afri-exchange/afriex-sdk:packages/media/src/MediaService.ts'
  - 'Afri-exchange/afriex-sdk:packages/media/src/types.ts'
---

# Afriex Media

`MediaService` uploads a file to Afriex storage and returns its `key`. Other
requests take that key: they never take the file or the upload URL.

## Setup

```ts
import { readFile } from "node:fs/promises";
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const { key } = await afriex.media.upload({
  fileName: "invoice-1042.pdf",
  type: "transaction",
  file: await readFile("./invoice-1042.pdf"),
  contentType: "application/pdf",
});

console.log(key);
```

`file` is a `Blob`, an `ArrayBuffer` or a `Uint8Array`. A Node.js `Buffer` is a
`Uint8Array`.

## Core Patterns

### Attach an invoice to a SWIFT withdrawal

```ts
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const invoice = await afriex.media.upload({
  fileName: "invoice-1042.pdf",
  type: "transaction",
  file: await readFile("./invoice-1042.pdf"),
  contentType: "application/pdf",
});

const transaction = await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_swift_456",
  sourceAmount: "2500",
  sourceCurrency: "USD",
  destinationCurrency: "USD",
  meta: {
    idempotencyKey: randomUUID(),
    reference: "invoice-1042",
    invoice: invoice.key,
  },
});

console.log(transaction.transactionId, transaction.status);
```

### Upload from a browser file input

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

export async function requestUpload(fileName: string) {
  const { url, key, expiresIn } = await afriex.media.createUploadUrl({
    fileName,
    type: "user",
  });
  return { url, key, expiresIn };
}
```

Run `createUploadUrl` on your server and hand `url` to the browser, which sends
the file with `PUT`. The API key stays on the server, and the browser never
needs it: the URL carries its own authorization for `expiresIn` seconds.

## Common Mistakes

### HIGH Passing the presigned URL where the key is expected

Wrong:

```ts
import { randomUUID } from "node:crypto";
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const uploadUrl = await afriex.media.createUploadUrl({
  fileName: "invoice-1042.pdf",
  type: "transaction",
});

await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_swift_456",
  sourceAmount: "2500",
  sourceCurrency: "USD",
  destinationCurrency: "USD",
  meta: {
    idempotencyKey: randomUUID(),
    reference: "invoice-1042",
    invoice: uploadUrl.url,
  },
});
```

Correct:

```ts
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const invoice = await afriex.media.upload({
  fileName: "invoice-1042.pdf",
  type: "transaction",
  file: await readFile("./invoice-1042.pdf"),
});

await afriex.transactions.create({
  customerId: "cus_123",
  destinationId: "pm_swift_456",
  sourceAmount: "2500",
  sourceCurrency: "USD",
  destinationCurrency: "USD",
  meta: {
    idempotencyKey: randomUUID(),
    reference: "invoice-1042",
    invoice: invoice.key,
  },
});
```

The presigned URL expires within minutes and is accepted by no endpoint. The
first snippet also never uploads the file: `createUploadUrl` only issues the
URL.

Source: packages/media/src/MediaService.ts (`createUploadUrl`, `upload`)

### HIGH Uploading a payment proof without type "transaction"

Wrong:

```ts
import { readFile } from "node:fs/promises";
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const proof = await afriex.media.upload({
  fileName: "transfer-receipt.pdf",
  file: await readFile("./transfer-receipt.pdf"),
});

console.log(proof.key);
```

Correct:

```ts
import { readFile } from "node:fs/promises";
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const proof = await afriex.media.upload({
  fileName: "transfer-receipt.pdf",
  type: "transaction",
  file: await readFile("./transfer-receipt.pdf"),
});

console.log(proof.key);
```

`type` defaults to `user`, and the two types are stored apart. The upload
succeeds either way, so the mistake shows only later, when
`submitPoolAccountProof` answers `400 INVALID_BUSINESS_POOL_ACCOUNT_REQUEST`
because the file is not found.

Source: packages/media/src/types.ts (`MediaUploadType`)

### MEDIUM Passing a file path as the file

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.media.upload({
  fileName: "invoice-1042.pdf",
  type: "transaction",
  file: "./invoice-1042.pdf" as never,
});
```

Correct:

```ts
import { readFile } from "node:fs/promises";
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.media.upload({
  fileName: "invoice-1042.pdf",
  type: "transaction",
  file: await readFile("./invoice-1042.pdf"),
});
```

`upload` takes the file contents, not a path, and throws a `ValidationError`
for a string. Sent as it is, the string itself would be stored as the file.

Source: packages/media/src/MediaService.ts (`upload`)

See also: afriex-transactions/SKILL.md — `meta.invoice` and pool-account
payment proofs.

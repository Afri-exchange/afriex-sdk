# @afriex/media

File upload service for the Afriex SDK. Upload an invoice, a payment proof or an identity document, and get back the key that other requests take.

## Installation

```bash
npm install @afriex/media @afriex/core
# or
pnpm add @afriex/media @afriex/core
```

## Usage

```typescript
import { readFile } from "node:fs/promises";
import { AfriexClient } from "@afriex/core";
import { MediaService } from "@afriex/media";

const client = new AfriexClient({
  apiKey: "your-api-key",
});

const media = new MediaService(client.getHttpClient());

// Upload a file in one call
const { key } = await media.upload({
  fileName: "invoice-1042.pdf",
  type: "transaction",
  file: await readFile("./invoice-1042.pdf"),
  contentType: "application/pdf",
});

// Or do the two steps yourself
const uploadUrl = await media.createUploadUrl({
  fileName: "invoice-1042.pdf",
  type: "transaction",
});

await fetch(uploadUrl.url, {
  method: "PUT",
  body: await readFile("./invoice-1042.pdf"),
});

console.log(uploadUrl.key, uploadUrl.expiresIn);
```

Attach the `key` to the request that needs the file. Requests never take the presigned URL.

| The file is                       | Upload it with `type` | Pass the key as                                      |
| --------------------------------- | --------------------- | ---------------------------------------------------- |
| An invoice for a SWIFT withdrawal | `transaction`         | `meta.invoice` on `transactions.create()`            |
| A pool-account payment proof      | `transaction`         | `fileKey` on `transactions.submitPoolAccountProof()` |
| An identity document              | `user`                | The document field that asks for it                  |

## API Reference

### `createUploadUrl(request: CreateUploadUrlRequest): Promise<UploadUrl>`

Generate a presigned URL to upload one file to.

**Endpoint:** `POST /media/url`

**Required:** `fileName`

**Optional:** `type`, one of `transaction` or `user`. Defaults to `user`.

**Returns:** `{ url, key, expiresIn }`. `PUT` the file to `url` within `expiresIn` seconds (usually 300). After that, request a new URL.

### `upload(request: UploadFileRequest): Promise<UploadedFile>`

Request an upload URL and upload the file to it.

**Required:** `fileName`, `file` (a `Blob`, an `ArrayBuffer` or a `Uint8Array`; a Node.js `Buffer` is a `Uint8Array`)

**Optional:** `type`, `contentType`

**Returns:** `{ key }`

**Throws:** `ValidationError` before any request when `file` is not one of the accepted types, `NetworkError` when the upload cannot be sent, and `AfriexError` when the storage host rejects it.

The upload goes to the storage host, not to the Afriex API, so it is sent without your API key and is not retried.

## The two upload types

`transaction` and `user` files are stored apart. A key from one is not found by an endpoint that expects the other: a pool-account payment proof uploaded as `user` is rejected with `INVALID_BUSINESS_POOL_ACCOUNT_REQUEST`.

## License

MIT

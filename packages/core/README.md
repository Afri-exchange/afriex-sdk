# @afriex/core

Core functionality for the Afriex SDK including HTTP client, configuration, and error handling.

## Installation

```bash
npm install @afriex/core
# or
pnpm add @afriex/core
```

## Usage

This package provides the base client and utilities used by other Afriex SDK packages.

```typescript
import { AfriexClient, Environment } from '@afriex/core';

const client = new AfriexClient({
    apiKey: 'your-api-key',
    environment: Environment.STAGING // or Environment.PRODUCTION (default)
});

// Access the HTTP client for requests
const httpClient = client.getHttpClient();

// Access configuration
const config = client.getConfig();
```

## Configuration Options

| Option          | Type                         | Required | Description                              |
| --------------- | ---------------------------- | -------- | ---------------------------------------- |
| `apiKey`        | `string`                     | Yes      | Your Afriex API key                      |
| `environment`   | `Environment`                | No       | API environment (default: `PRODUCTION`)  |
| `customConfig`  | `Partial<EnvironmentConfig>` | No       | Override default base URL, timeout, etc. |
| `logLevel`      | `LogLevel`                   | No       | Logging level (default: `ERROR`)         |
| `enableLogging` | `boolean`                    | No       | Enable/disable logging (default: `true`) |
| `retryConfig`   | `RetryConfig`                | No       | Custom retry configuration               |
| `apiVersion`    | `string`                     | No       | Sent as `x-api-version` (default: `2026-05-18`) |
| `signRequest`   | `RequestSigner`              | No       | Signs each request, for a business with payload signing enabled |
| `userAgent`     | `string`                     | No       | Sent as `User-Agent` (default: `Afriex-TypeScript-SDK`) |

### Environment Values

```typescript
enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production'
}
```

### RetryConfig Options

```typescript
interface RetryConfig {
    maxRetries: number;        // Number of retry attempts
    retryDelay: number;        // Delay between retries (ms)
    retryableStatusCodes: number[]; // HTTP codes to retry
    retryableMethods?: HttpMethod[]; // HTTP methods to retry
}
```

## Retries

Retries are off by default: `maxRetries` is `0`. When you turn them on, a request is retried only if its method is in `retryableMethods`, which defaults to `GET`, `PUT`, `HEAD`, `DELETE`, `OPTIONS` and `TRACE`.

`POST` and `PATCH` are left out, because repeating one can repeat its effect. So with the default settings, creating a transaction or starting a payment batch is sent once, whatever `maxRetries` is.

```typescript
const client = new AfriexClient({
  apiKey: "your-api-key",
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
});
```

Attempt _n_ waits `retryDelay * 2 ** (n - 1)` milliseconds. A request that times out is not retried.

Add `POST` to `retryableMethods` only if every `POST` you send through the client can be repeated safely:

| Request                         | What a repeat does, if the first attempt was received   |
| ------------------------------- | ------------------------------------------------------- |
| `transactions.create()`         | Answered with `409 DUPLICATE_REQUEST`                   |
| `customers.create()`            | Answered with `409`                                     |
| `paymentBatches.addRecipient()` | Answered with `409 DUPLICATE_REQUEST`                   |
| `paymentBatches.withdraw()`     | Starts a second run, which pays every recipient again   |

A `409` on a retry means the first attempt worked, but it reaches your code as an error. So even where a repeat is harmless, read the state back instead of trusting the retry's answer.

## API version

Every request carries the `x-api-version` header, set to the version this SDK's types describe. `DEFAULT_API_VERSION` holds it. Pass `apiVersion` to send another one; the API answers `400` for a version it does not support.

## User agent

A client built from `@afriex/core` sends `User-Agent: Afriex-TypeScript-SDK`. `@afriex/sdk` adds its own version, as in `Afriex-TypeScript-SDK/4.1.0`. Pass `userAgent` to send something else.

## Request signing

If payload signing is enabled for your business, pass a `signRequest` function. It is called for every request, and what it returns is sent in the `x-api-signature` header.

```typescript
import { AfriexClient, type RequestToSign } from "@afriex/core";

// Replace with the signature scheme agreed with Afriex.
declare function sign(payload: string): Promise<string>;

const client = new AfriexClient({
  apiKey: "your-api-key",
  signRequest: ({ method, url, body }: RequestToSign) => sign(body),
});
```

`body` is the JSON exactly as it is sent, or an empty string for a request without one. Return `undefined` to send a request unsigned.

Afriex defines the signature scheme when it enables signing for your business. The SDK does not compute the signature; it only sends what `signRequest` returns.

## Exports

- `AfriexClient` - Base client class
- `HttpClient` - HTTP client for API requests
- `Config` - Configuration class
- `AfriexConfig` - Configuration interface
- `RetryConfig`, `HttpMethod`, `DEFAULT_RETRYABLE_METHODS` - Retry configuration
- `RequestSigner`, `RequestToSign`, `API_SIGNATURE_HEADER` - Request signing
- `DEFAULT_API_VERSION`, `API_VERSION_HEADER` - The API version the SDK sends
- `DEFAULT_USER_AGENT` - The `User-Agent` sent when none is configured
- `Environment` - Environment enum
- `ValidationError` - Validation error class
- `AfriexError` - Base error class
- `ApiError` - API error class
- `ApiErrorResponse` - The Afriex API's error body shape: `{ code, error, details }`, where `error` is a human-readable string and `details` carries `errorMessage`/`friendlyMessage`/`data`
- `AfriexErrorCode` - The real `code` values the API returns (e.g. `BUSINESS_CUSTOMER_NOT_FOUND`, `VALIDATION_ERROR`, `VIRTUAL_ACCOUNT_LIMIT_REACHED`)
- `NetworkError` - Network error class
- `RateLimitError` - Rate limit error class

## Error Handling

`ApiError` parses the API's actual error body, so `error.message` is the API's `details.friendlyMessage` (falling back to `details.errorMessage`, then the top-level `error` string):

```typescript
import { ApiError } from "@afriex/core";

try {
  await httpClient.post("/customer", body);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.statusCode); // e.g. 400
    console.log(error.errorCode); // e.g. "INVALID_BUSINESS_CUSTOMER_REQUEST"
    console.log(error.message); // e.g. "No customer phone provided"
    console.log(error.details); // { errorMessage, friendlyMessage, data? }
  }
}
```

## License

MIT

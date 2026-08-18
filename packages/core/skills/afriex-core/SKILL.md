---
name: afriex-core
description: >
  Transport, configuration, and error handling for the Afriex Business API via
  @afriex/core — AfriexClient, AfriexConfig, Environment.STAGING vs PRODUCTION,
  baseUrl, timeout, retryConfig/maxRetries/retryableStatusCodes, the x-api-key
  header, and the AfriexError / ApiError / RateLimitError / NetworkError /
  ValidationError hierarchy plus AfriexErrorCode. Load when configuring an
  Afriex client, choosing sandbox vs production, tuning retries or timeouts,
  handling or narrowing Afriex SDK errors, or calling an endpoint the typed
  services do not cover.
metadata:
  type: core
  library: '@afriex/core'
  library_version: '2.1.0'
sources:
  - 'Afri-exchange/afriex-sdk:packages/core/src/client/AfriexClient.ts'
  - 'Afri-exchange/afriex-sdk:packages/core/src/client/HttpClient.ts'
  - 'Afri-exchange/afriex-sdk:packages/core/src/config/Config.ts'
  - 'Afri-exchange/afriex-sdk:packages/core/src/config/Environment.ts'
  - 'Afri-exchange/afriex-sdk:packages/core/src/errors/ApiError.ts'
  - 'Afri-exchange/afriex-sdk:packages/core/src/errors/ErrorCodes.ts'
---

# Afriex Core — Client, Configuration, and Errors

`@afriex/core` holds the transport (`AfriexClient` wrapping a `ky` instance),
the resolved `Config`, and the error classes that every `@afriex/*` service
throws. Applications normally construct `AfriexSDK` from `@afriex/sdk`, which
extends `AfriexClient` and exposes the typed services; construct
`AfriexClient` directly only when wiring individual service packages.

## Setup

```ts
import { AfriexClient, Environment } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const response = await client
  .getHttpClient()
  .get<{ data: Record<string, number> }>("/org/balance");

console.log(response.data);
```

`environment` selects the base URL: `Environment.STAGING` →
`https://sandbox.api.afriex.com/api/v1`, `Environment.PRODUCTION` →
`https://api.afriex.com/api/v1`. The key is sent as the `x-api-key` header.

## Core Patterns

### Turn on retries — they are disabled by default

```ts
import { AfriexClient, Environment } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
});
```

`retryDelay` is the base for exponential backoff: attempt *n* waits
`retryDelay * 2 ** (n - 1)` ms.

### Narrow failures by error class

```ts
import {
  AfriexClient,
  ApiError,
  NetworkError,
  RateLimitError,
  ValidationError,
  AfriexErrorCode,
} from "@afriex/core";

const client = new AfriexClient({ apiKey: process.env.AFRIEX_API_KEY! });

try {
  await client.getHttpClient().get("/customer/cus_missing");
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log("retry after seconds:", error.retryAfter);
  } else if (error instanceof ApiError) {
    if (error.errorCode === AfriexErrorCode.BUSINESS_CUSTOMER_NOT_FOUND) {
      console.log("no such customer");
    }
    console.log(error.statusCode, error.errorCode, error.details);
  } else if (error instanceof NetworkError) {
    console.log("transport failed:", error.originalError?.message);
  } else if (error instanceof ValidationError) {
    console.log(error.fields);
  }
}
```

`RateLimitError` extends `ApiError`, so test it first. `ValidationError` is
raised client-side by the service packages before any request is sent and has
no `statusCode`.

### Override base URL and timeout

```ts
import { AfriexClient } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  customConfig: {
    baseUrl: "https://api.afriex.com/api/v1",
    timeout: 60000,
  },
  enableLogging: true,
});
```

### Call an endpoint the typed services do not cover

```ts
import { AfriexClient } from "@afriex/core";

const client = new AfriexClient({ apiKey: process.env.AFRIEX_API_KEY! });

const result = await client.getHttpClient().post<{ data: { id: string } }>(
  "/some/new-endpoint",
  { field: "value" },
  { headers: { "x-request-id": "req_1" }, timeout: 15000 }
);

console.log(result.data.id);
```

`RequestOptions` accepts `headers`, `params` (mapped to query string), and
`timeout`. The same error normalization applies.

## Common Mistakes

### CRITICAL Assuming failed requests are retried automatically

Wrong:

```ts
import { AfriexClient, Environment } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
});
```

Correct:

```ts
import { AfriexClient, Environment } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.PRODUCTION,
  retryConfig: { maxRetries: 3, retryDelay: 1000, retryableStatusCodes: [408, 429, 500, 502, 503, 504] },
});
```

`DEFAULT_CONFIG` sets `maxRetries: 0` for both environments, so a single 503
or 429 surfaces as a thrown error with no retry attempt.

Source: packages/core/src/config/Environment.ts (DEFAULT_CONFIG)

### CRITICAL Omitting environment sends test traffic to production

Wrong:

```ts
import { AfriexClient } from "@afriex/core";

const client = new AfriexClient({ apiKey: process.env.AFRIEX_API_KEY! });
```

Correct:

```ts
import { AfriexClient, Environment } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment:
    process.env.NODE_ENV === "production"
      ? Environment.PRODUCTION
      : Environment.STAGING,
});
```

`Config` defaults `environment` to `Environment.PRODUCTION`, so an omitted
field points at `https://api.afriex.com` and moves real money.

Source: packages/core/src/config/Config.ts (`config.environment || Environment.PRODUCTION`)

### HIGH Using RateLimitError.retryAfter as milliseconds

Wrong:

```ts
import { RateLimitError } from "@afriex/core";

async function backoff(error: RateLimitError): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, error.retryAfter ?? 1000));
}
```

Correct:

```ts
import { RateLimitError } from "@afriex/core";

async function backoff(error: RateLimitError): Promise<void> {
  const seconds = error.retryAfter ?? 1;
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
```

`retryAfter` is the `retry-after` response header parsed with `parseInt`, so
it is a count of seconds — using it as a millisecond delay retries almost
immediately and keeps the caller rate-limited.

Source: packages/core/src/errors/RateLimitError.ts

### HIGH Switching on error.message instead of errorCode

Wrong:

```ts
import { ApiError } from "@afriex/core";

function isMissingCustomer(error: unknown): boolean {
  return error instanceof ApiError && error.message === "Business customer not found";
}
```

Correct:

```ts
import { ApiError, AfriexErrorCode } from "@afriex/core";

function isMissingCustomer(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.errorCode === AfriexErrorCode.BUSINESS_CUSTOMER_NOT_FOUND
  );
}
```

`ApiError.message` is built from `details.friendlyMessage || details.errorMessage
|| error`, so it is end-user copy that changes without notice; `errorCode` is
the stable machine value.

Source: packages/core/src/errors/ApiError.ts (message resolution)

### MEDIUM Expecting a missing API key to throw AfriexError

Wrong:

```ts
import { AfriexClient, AfriexError } from "@afriex/core";

try {
  const client = new AfriexClient({ apiKey: process.env.AFRIEX_API_KEY ?? "" });
  console.log(client.getConfig().baseUrl);
} catch (error) {
  if (error instanceof AfriexError) {
    console.log("bad config");
  }
}
```

Correct:

```ts
import { AfriexClient } from "@afriex/core";

const apiKey = process.env.AFRIEX_API_KEY;
if (!apiKey) {
  throw new Error("AFRIEX_API_KEY is not set");
}

const client = new AfriexClient({ apiKey });
console.log(client.getConfig().baseUrl);
```

`Config.validateConfig` throws a plain `Error`, not an `AfriexError`, so an
`instanceof AfriexError` guard swallows nothing and the misconfiguration
escapes the handler.

Source: packages/core/src/config/Config.ts (`validateConfig`)

### MEDIUM Passing timeout: 0 to disable the request timeout

Wrong:

```ts
import { AfriexClient } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  customConfig: { timeout: 0 },
});
```

Correct:

```ts
import { AfriexClient } from "@afriex/core";

const client = new AfriexClient({
  apiKey: process.env.AFRIEX_API_KEY!,
  customConfig: { timeout: 120000 },
});
```

`Config` resolves timeout with `customConfig.timeout || envConfig.timeout`, so
`0` is falsy and silently falls back to the 30000 ms default instead of
disabling the timeout.

Source: packages/core/src/config/Config.ts (timeout resolution)

See also: afriex-sdk/SKILL.md — the `AfriexSDK` facade that wires these
options to the typed services.

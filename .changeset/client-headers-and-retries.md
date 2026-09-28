---
"@afriex/core": minor
"@afriex/sdk": minor
---

Send the API version, support request signing, and say which requests are retried.

**@afriex/core**

- Every request carries `x-api-version`. It defaults to `2026-05-18`, the version the SDK's types describe, exported as `DEFAULT_API_VERSION`. Pass `apiVersion` to send another one.
- `signRequest` signs each request, for a business that has payload signing enabled. It receives the method, the URL and the body as it is sent, and what it returns goes in `x-api-signature`. The SDK does not compute the signature: Afriex defines the scheme when it enables signing.
- `retryConfig.retryableMethods` sets which HTTP methods are retried. It defaults to `GET`, `PUT`, `HEAD`, `DELETE`, `OPTIONS` and `TRACE`, exported as `DEFAULT_RETRYABLE_METHODS`.

  This does not change what is retried. `POST` and `PATCH` were never retried, whatever `maxRetries` was; the guides implied otherwise and now say so. Adding `POST` is for clients whose every `POST` can be repeated safely: a repeated `paymentBatches.withdraw()` pays every recipient again.

- `userAgent` sets the `User-Agent` header. A client built from `@afriex/core` alone sends `Afriex-TypeScript-SDK`, in place of the fixed `Afriex-TypeScript-SDK/1.0.0` it sent before.

**@afriex/sdk**

- `User-Agent` carries the version of `@afriex/sdk`, as in `Afriex-TypeScript-SDK/4.1.0`. `SDK_VERSION` exports that version.
- `AfriexSDKConfig` accepts `apiVersion`, `signRequest`, `userAgent` and `retryConfig.retryableMethods`, and the package re-exports the new types and constants.

**Release process**

- `pnpm run version` now also writes the new version of `@afriex/sdk` into `packages/sdk/src/version.ts`, and the release workflow calls it. A unit test fails if the two differ.

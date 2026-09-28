# @afriex/core

## 2.2.0

### Minor Changes

- d4d9454: Catch up with version 1.0.13 of the API reference. Everything here is additive.

  **@afriex/transactions**

  - `TransactionStatus` gains `RFI_REQUESTED`, a review state to treat as non-terminal like `IN_REVIEW`.
  - `TransactionChannel` gains `POOL_ACCOUNT`, `PAYMENT_LINQ` and `ADMIN`.
  - `TransactionFailureCode` gains `AFX_ACCOUNT_CLOSED` and `AFX_NAME_MISMATCH`.
  - `TransactionMeta.settlement` (`"spot" | "request"`), and `correspondentBankName` / `correspondentBankAccountNumber` on the create request. The pair is validated as sent together, and `settlement: "request"` as WITHDRAW only.
  - `meta.invoice` is documented as what it is: the object key of an uploaded invoice, not a Base64 document.
  - `ListTransactionsParams.status` is typed as `TransactionListStatus`, which leaves out `COMPLETED`. The API answers 422 for it.

  **@afriex/customers**

  - `Customer.reference`, the value to supply as the pool-account reference on a payment proof.

  **@afriex/payment-methods**

  - `PaymentMethod.bankAddress` and the `PaymentMethodBankAddress` type.
  - `ListVirtualAccountsParams` gains `country` and `amount`.
  - `getPoolAccount()`, which returns the single pool account for a country. `listPoolAccounts()` is deprecated in its favour.
  - Virtual accounts and pool accounts are no longer described as production only. Both answer in the sandbox.

  **@afriex/core**

  - `AfriexErrorCode` gains the codes the reference documents and the SDK lacked: `DUPLICATE_REQUEST`, `EMAIL_ALREADY_EXISTS`, `PHONE_NUMBER_ALREADY_EXISTS`, `EXTERNAL_REQUEST_ERROR`, `RATE_LIMIT_ERROR`, `OTP_INCORRECT`, `INVALID_TRANSACTION_CHANNEL`, `UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY`, `VIRTUAL_ACCOUNT_PENDING_COMPLIANCE_REVIEW` and the three `INVALID_BUSINESS_*_ID` codes. It also gains four seen in the sandbox: `BAD_REQUEST_ERROR`, `INVALID_BUSINESS_PAYMENT_METHOD_REQUEST`, `PROCESSOR_NOT_FOUND` and `TRANSACTION_AMOUNT_TOO_SMALL`.
  - `RATE_LIMIT_EXCEEDED` is deprecated. The API sends `RATE_LIMIT_ERROR`.
  - `ApiError` reads the `{ message }` body that environment-restricted endpoints return with a 403, and reports those as `AfriexErrorCode.FORBIDDEN`. Before, they surfaced as "An API error occurred" with no code.

  **@afriex/balance**

  - `TopUpTransaction` gains `sourceId`, `merchantReference`, `rate` and `fee`, and its status union now covers every transaction status.

  **@afriex/sdk**

  - Re-exports the new types, plus `TopUpParams`, `TopUpTransaction` and the other top-up types, and `CreateCheckoutSessionResponse`.
  - `TransactionStatus` is exported as a value as well as a type, along with `DEFAULT_TRANSACTION_TYPE`.

- d4d9454: Send the API version, support request signing, and say which requests are retried.

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

- d4d9454: Add the 19 operations the API reference documents and the SDK lacked. Everything here is additive. The three new packages are released as 1.0.0.

  **@afriex/media** (new)

  - `MediaService`, on the client as `afriex.media`.
  - `upload()` requests an upload URL and sends the file to it, then returns the `key` that other requests take. It accepts a `Blob`, an `ArrayBuffer` or a `Uint8Array`. The upload goes to the storage host without the API key.
  - `createUploadUrl()` returns `{ url, key, expiresIn }` for when something else sends the file.

  **@afriex/payment-batches** (new)

  - `PaymentBatchService`, on the client as `afriex.paymentBatches`: `create`, `get`, `list`, `update`, `delete`, `addRecipient`, `addRecipients`, `listRecipients`, `updateRecipient`, `removeRecipient`, `withdraw` and `listSessions`.
  - `withdraw()` without a `sessionId` pays every recipient again. Pass the `sessionId` of a run to retry only the payouts that failed in it.
  - `addRecipient()` and `updateRecipient()` return the saved account. Its `id` is the recipient's `paymentMethodId`; the `recipientId` that update and remove take comes from `listRecipients()`.
  - A recipient on `UPI` or `INTERAC` needs no `institution`, as on a payment method. The reference marks it required for every channel; the sandbox accepts the recipient without it.

  **@afriex/sme-registration** (new)

  - `SmeRegistrationService`, on the client as `afriex.smeRegistration`: `initiate`, `confirmOtp`, `submit` and `getStatus`.
  - Written from the API reference alone. The endpoints need the `COMPLIANCE.KYB.*` key permissions, so they were not run against the sandbox. The reference does not list the company detail fields of the `SUBMIT` step, so `submit()` sends the object it is given.

  **@afriex/transactions**

  - `submitPoolAccountProof()` submits proof of a deposit made to the pool account and returns the deposit, created `IN_REVIEW`.
  - `getAdvice()` returns the settlement advice of a withdrawal created with `meta.settlement: "request"`.
  - `simulate()` completes a pending sandbox transaction with the outcome you choose. Sandbox only.

  **@afriex/payment-methods**

  - `simulateTransfer()` credits a bank transfer into a sandbox virtual account. Sandbox only.

  **@afriex/core**

  - `AfriexErrorCode` gains two codes seen in the sandbox: `INVALID_BUSINESS_PAYMENT_BATCH_REQUEST` and `NOT_FOUND_ERROR`.

  **@afriex/sdk**

  - The client gains `media`, `paymentBatches` and `smeRegistration`, and the package re-exports the three services and their types.

### Patch Changes

- d4d9454: Deprecate exports that do not describe the API, and correct two guides.

  **@afriex/core**

  Nothing is removed and no value changes. These exports are marked `@deprecated`, each with what to use in its place:

  - `SUPPORTED_CURRENCIES`, `SUPPORTED_COUNTRIES`, `isValidCurrency`, `isValidCountry`, `Currency` and `Country`. The lists hold 11 currencies and 20 countries; the API supports 72 currencies. `isValidCurrency("ZAR")` answers `false` for a currency the API accepts.
  - `PaymentMethod`, whose values (`bank_account`, `debit_card`) are not the API's.
  - `PaginationParams`, `PaginatedResponse`, `ApiResponse`, `Money` and `Address`, which match nothing the API takes or returns.

  **@afriex/rates**

  - `getRates()` with no arguments returns the rates from `USD`, not every pair. The README and the guide said it returned all pairs; `fromSymbols` defaults to `USD` only.
  - The comments on `fromSymbols` and `toSymbols` were swapped, and `getRates` named an endpoint it does not call.
  - The README said `getRate()` returns `'0'` for a pair without a rate. It throws.

  **@afriex/checkout**

  - `createSession()` checks the limits the API sets on `metadata` before sending: at most 50 entries, keys of 1 to 128 characters, values of at most 1024. The API rejects a request that goes over any of them.

## 2.1.0

### Minor Changes

- Populate `ApiError` from the ky 2.x error payload.

  `HttpClient` read error bodies with `error.response.clone().json()`, the ky 1.x
  pattern. ky 2.x consumes the body up front to populate `error.data`, so the clone
  threw `Body has already been consumed`, the failure was swallowed, and every
  `ApiError` surfaced with `errorCode`, `details` and `response` empty and the
  generic `"An API error occurred"` message instead of the API's `friendlyMessage`.

  Errors now carry the real `code`, `details` and message, so callers can branch on
  `errorCode` and show `friendlyMessage`. Non-JSON and unparseable bodies still fall
  back to a bare `ApiError`.

## 2.0.1

### Security Patch Changes

- Rebuild against TypeScript 7 and refresh build tooling.

  The build toolchain moves from TypeScript 5.9.3 to 7.0.2 and `@types/node` from 22.x
  to 26.x. TypeScript 7 no longer auto-discovers hoisted `@types` packages through
  pnpm's isolated `node_modules`, so the shared tsconfig now sets `"types": ["node"]`
  explicitly. No public API changes — the `typescript >=5.0.0` peer range is unchanged
  and consumers on TypeScript 5 are unaffected.

## 2.0.0

### Major Changes

- Fix drift between the SDK and the current Afriex Business API contract, and add the endpoints that were missing entirely.

  **New endpoints:**

  - `customers.update(customerId, request)` — `PATCH /customer/{customerId}`, partial profile update (`fullName`/`email`/`phone`)
  - `customers.verify(customerId, request)` — `POST /customer/{customerId}/verify`, BVN identity verification
  - `transactions.authorize(transactionId, request)` — `POST /transaction/{transactionId}/authorize`, OTP authorization for deposits left in `CUSTOMER_ACTION_REQUIRED`

  **Breaking fixes:**

  - `customers.updateKyc()` now sends the KYC document map directly as the request body instead of wrapping it in `{ kyc: {...} }` — the wrapped shape was rejected by the real API with `INVALID_KYC_DOCUMENT_TYPE`
  - `Customer.name` replaces `Customer.fullName` on API responses (`fullName` remains the field name on `CreateCustomerRequest`/`UpdateCustomerRequest`, matching the API's asymmetric request/response naming)
  - `ApiError` now parses the API's actual error body — `{ code, error, details: { errorMessage, friendlyMessage, data } }` — instead of an invented `{ error: { code, message } }` shape. `error.message` now surfaces the real `friendlyMessage`/`errorMessage`/`error` text instead of falling back to a generic message on every request
  - `AfriexErrorCode` now lists the real `code` values the API returns (`BUSINESS_CUSTOMER_NOT_FOUND`, `INVALID_KYC_DOCUMENT_TYPE`, `VALIDATION_ERROR`, `VIRTUAL_ACCOUNT_LIMIT_REACHED`, etc.) instead of a fabricated set that never matched a live response
  - `TransactionStatus` no longer includes the non-existent `COMPLETED` value; added `SCHEDULED`, `DISPUTED`, `DISPUTE_RESOLVED`, `DISPUTE_WON`, `DISPUTE_LOST`, `DISPUTE_EVIDENCE_SUBMITTED`
  - `TransactionMeta.merchantId` removed — not a real field on the API's transaction metadata
  - `PaymentChannel` split into the full response-side channel set and a narrower `CreatablePaymentChannel` used by `createPaymentMethod` (now includes `VIRTUAL_BANK_ACCOUNT` and `ACH_BANK_ACCOUNT`, which were previously impossible to type)
  - `balance.getBalance()` no longer requires `currencies` — omit it (or call with no arguments) to fetch balances for every supported currency, matching the API's documented default

  **Additive fixes:**

  - `Transaction` gained `channel`, `merchantReference`, `rate`, and `meta.otpRequired`/`meta.failureReason`
  - `CreateTransactionRequest` gained `shouldPreferSourceAmount`
  - `PaymentMethod` gained `reference`, `capabilities`, `routingNumber`, `status`, and the CARD-only (`last4`, `brand`, `expiration`, `cardName`) and dynamic-virtual-account (`expiresInMinutes`, `amount`, `extra`) fields
  - `ListPaymentMethodsParams` gained `channel`, `currencies`, `capabilities`, and `status` filters
  - `InstitutionCodesParams.country` is no longer locked to the literal `"US"` — SWIFT-code lookups work for any country
  - Webhook payload types (`TransactionWebhookData`, `PaymentMethodWebhookData`) updated to match the real payloads: added `merchantReference`, `meta.reference`, and `status`; removed the phantom `meta.merchantId`; `TransactionWebhookStatus` aligned with the full status list above

  **MCP server:**

  - Added `afriex_update_customer`, `afriex_verify_customer`, and `afriex_authorize_transaction` tools
  - Fixed `afriex_update_customer_kyc` to send the unwrapped KYC document map
  - Removed the `channel` and `meta.merchantId` inputs from `afriex_create_transaction` — neither is accepted by the real API

## 1.2.0

### Minor Changes

- Migrate to full ESM

  - Switch `module`/`moduleResolution` to `NodeNext` in TypeScript config
  - Add `"type": "module"` to all packages
  - Replace axios with ky (ESM-native HTTP client based on Fetch API)
  - Add `.js` extensions to all relative imports
  - Replace Jest with Vitest for ESM-native testing
  - Drop `"require"` from package exports (ESM-only)

# @afriex/sdk

## 5.0.0

### Major Changes

- d4d9454: **Breaking:** stop offering values the API rejects. Every removal below was confirmed against the sandbox, and each one turns a runtime `4xx` into a compile error.

  **@afriex/customers**

  - `UpdateCustomerKycRequest` no longer accepts `COUNTRY`, `PHONE` or `BVN`. The API answers `400 INVALID_KYC_DOCUMENT_TYPE` for all three, and rejects the whole request when one is mixed in with valid types. `updateKyc()` now throws a `ValidationError` that says where each value belongs: a BVN goes through `verify()`, a phone number through `update()`. `KycDocumentType` keeps all 21 values, since they can still be read back from `meta.kyc.data`; `UpdatableKycDocumentType` names the 18 that can be written.

  **@afriex/payment-methods**

  - `CreatablePaymentChannel` drops `ALIPAY` and `PAYBILL_TILL`. Create Alipay on `WE_CHAT` with `institutionCode` and `institutionName` set to `ALIPAY`.
  - `InstitutionListChannel` is now `BANK_ACCOUNT | SWIFT | MOBILE_MONEY | ACH_BANK_ACCOUNT`. `UPI`, `INTERAC` and `WE_CHAT` answer `400 INVALID_TRANSACTION_CHANNEL`. `ACH_BANK_ACCOUNT` is new: the sandbox serves the US routing directory for it.
  - `ListPaymentMethodsParams` filters are typed to what the endpoint accepts: `channel` takes the 8 values of `PaymentMethodListChannel`, `status` takes `active` and `pending`, `capabilities` takes `WITHDRAW`. Anything else answers 422.
  - `ResolveAccountParams.institutionCode` is required. The API rejects a request without it for `MOBILE_MONEY` as well as `BANK_ACCOUNT`.
  - `CreateVirtualAccountParams` drops `country` and `reference`, which the API rejects as not allowed, and types `label` as `VirtualAccountLabel`.
  - `createVirtualAccount()` returns `PaymentMethod | null`. It is `null` when the issuing bank opens the account after the request returns; the account then arrives by the `PAYMENT_METHOD.CREATED` webhook. Before, the caller got an empty object typed as a full `PaymentMethod`.
  - `ResolvedAccount` drops `recipientEmail`, `recipientPhone` and `recipientAddress`, which the endpoint never returns.

  **@afriex/transactions**

  - A `SWAP` takes exactly one of `sourceAmount` or `destinationAmount`, in the type (`SwapAmount`) and in the validator. The API rejects a swap that sends both.

  **@afriex/webhooks**

  - On `PaymentMethodWebhookData`, `institution`, `transaction`, `recipient`, `accountName` and `accountNumber` are optional. The API omits empty fields, and card payloads carry none of them. Readers need a guard. The type gains the card fields, `currency`, `capabilities` and `reference`.

  **@afriex/mcp-server**

  - Tool schemas follow the same narrowing, so a model is no longer offered values that fail. `afriex_create_virtual_account` reports `pending: true` when the account is opened later.

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

- d4d9454: Reconcile transaction types with the Business API docs.

  - `destinationAmount` is now optional on WITHDRAW and DEPOSIT. Sending `sourceAmount` alone lets the API derive the destination amount at the live forward rate. The validator now requires at least one of the two amounts.
  - `TransactionWebhookData.meta` is now the named `TransactionWebhookMeta` and types `failureReason`.
  - `COMPLETED` added to `TransactionStatus` and `TransactionWebhookStatus`, marked deprecated: it is not part of the published API.

- d4d9454: Stop rejecting requests the API documents and accepts. Each change was confirmed against the sandbox.

  - **Checkout accepts `CARD`.** `createSession()` rejected it client-side although the API lists it and returns `201`. `channels` is a cap: channels the currency cannot collect on are dropped, and `session.channels` reports what the payer will be offered.
  - **Payment method creation is validated per channel.** `UPI` and `INTERAC` no longer require `institution`, and `VIRTUAL_BANK_ACCOUNT` requires none of `accountName`, `accountNumber` or `institution`. `CreatePaymentMethodRequest` is now a union keyed on `channel`; the per-channel shapes are exported. `customerId` stays required: the reference marks it optional, but the sandbox answers `404 BUSINESS_CUSTOMER_NOT_FOUND` without it.
  - **Transactions can be created from either amount.** `sourceAmount` is no longer required by the type, so a withdrawal, deposit or swap can send `destinationAmount` alone. Amounts accept a number or a numeric string (`TransactionAmount`).
  - `TransactionStatus.COMPLETED` is marked deprecated. It is not part of the published API.

- d4d9454: Type the webhook payloads the API reference documents.

  - **New event: `POOL_DEPOSIT_REQUEST.REJECTED`.** Sent when a pool-account deposit is rejected in review. `WebhookPayload` gains `PoolDepositRequestWebhookPayload`, whose `data` carries `transactionId`, `reference`, `amount`, `currency`, `rejectionReason` and `resubmissionRequired`. A `switch` over `event.event` that has no `default` branch needs a case for it.
  - **`rate` and `fee` on transaction events.** Both sit at the top level of `data`, beside the amounts, as the reference documents.
  - `TransactionWebhookStatus` gains `RFI_REQUESTED`.
  - `CheckoutSessionWebhookData` types its ten documented fields. It was an open map of unknown values, and still accepts keys it does not name.
  - `CustomerWebhookData` gains `meta`, `createdAt` and `updatedAt`.
  - `verify()` and `verifyAndParse()` accept the raw body as a `Buffer` as well as a string.
  - `TriggerableWebhookEventType` names the events the sandbox trigger can fire. `TriggerWebhookRequest.event` uses it, so the new pool event cannot be passed to `triggerTestWebhook()`, which the API rejects with 400.

### Patch Changes

- d4d9454: Correct the READMEs and skill guides that ship with the packages. Every TypeScript example in them now compiles against the SDK.

  - Pagination examples started at page 1, which skips the first page. Pages start at 0.
  - Mobile money examples sent `accountNumber` with a leading `+`, which the API rejects. It takes digits only.
  - The payment-methods guide said virtual accounts and pool accounts answer 403 in the sandbox. Both work there.
  - The payment-methods guide recommended list filters the API rejects with 422, and said mobile money resolves without an `institutionCode`. It does not.
  - The customers guide passed `BVN` and `NIN` to `updateKyc()`. A BVN goes through `verify()`, and `NIN` is not a document type.
  - The transactions guide now covers the `409 DUPLICATE_REQUEST` a reused idempotency key returns, and the review statuses.
  - The `@afriex/sdk` quick start created a checkout session without the required `channels`.

- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
  - @afriex/core@2.2.0
  - @afriex/customers@4.0.0
  - @afriex/transactions@3.0.0
  - @afriex/payment-methods@5.0.0
  - @afriex/balance@2.1.0
  - @afriex/rates@2.0.2
  - @afriex/checkout@3.1.0
  - @afriex/webhooks@3.0.0
  - @afriex/media@1.0.0
  - @afriex/payment-batches@1.0.0
  - @afriex/sme-registration@1.0.0

## 4.1.0

### Minor Changes

- Picks up the corrected `@afriex/payment-methods` types.

  `Institution.institutionId` is optional and `InstitutionCodesResponse.data` is
  nullable, both re-exported from here, so readers of either need a guard. See
  @afriex/payment-methods@4.1.0.

- Re-export the `PaymentMethod` sub-object types.

  `PaymentMethodInstitution`, `PaymentMethodRecipient` and `PaymentMethodTransaction`
  were reachable only from `@afriex/payment-methods`. `PaymentMethodInstitution` is the
  type you construct to send the `correspondentBankName` /
  `correspondentBankAccountNumber` pair required for USD (SWIFT) payouts, so it could
  not stay unnameable from the main entry point.

- Updated dependencies
  - @afriex/balance@2.0.0
  - @afriex/checkout@3.0.1
  - @afriex/customers@3.1.0
  - @afriex/payment-methods@4.1.0
  - @afriex/rates@2.0.1

## 4.0.0

### Major Changes

- **Breaking:** align the declared response types with what the API returns.

  Every endpoint was exercised against the sandbox and its runtime response compared to
  the type its method declares. The corrections that follow are breaking for consumers:
  four payment-method calls now expose the API's `{ data }` envelope, `Customer.kyc` is
  gone in favour of `meta.kyc.data`, `triggerTestWebhook()` returns a different shape,
  checkout `channels` is required, and `getRate()` throws rather than returning `"0"`.
  See the package changelogs below for the detail on each.

- Re-export the types introduced by the response-shape corrections.

  New: `InstitutionListResponse`, `InstitutionCode`, `InstitutionCodesParams`,
  `InstitutionCodesResponse`, `ResolvedAccount`, `CryptoWallet`, `CryptoWalletData`,
  `CustomerKyc`, `CustomerMeta`, `KycDocumentType`, `TriggerWebhookResult`,
  `TriggerWebhookResponse`.

- Updated dependencies
  - @afriex/balance@1.5.0
  - @afriex/checkout@3.0.0
  - @afriex/core@2.1.0
  - @afriex/customers@3.0.0
  - @afriex/payment-methods@4.0.0
  - @afriex/rates@2.0.0
  - @afriex/transactions@2.1.0
  - @afriex/webhooks@2.0.0

## 3.0.1

### Security Patch Changes

- Rebuild against TypeScript 7 and refresh build tooling.

  The build toolchain moves from TypeScript 5.9.3 to 7.0.2 and `@types/node` from 22.x
  to 26.x. TypeScript 7 no longer auto-discovers hoisted `@types` packages through
  pnpm's isolated `node_modules`, so the shared tsconfig now sets `"types": ["node"]`
  explicitly. No public API changes — the `typescript >=5.0.0` peer range is unchanged
  and consumers on TypeScript 5 are unaffected.

- Updated dependencies
  - @afriex/balance@1.4.1
  - @afriex/checkout@2.0.2
  - @afriex/core@2.0.1
  - @afriex/customers@2.0.1
  - @afriex/payment-methods@3.0.1
  - @afriex/rates@1.4.2
  - @afriex/transactions@2.0.1
  - @afriex/webhooks@1.5.1

## 3.0.0

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

### Patch Changes

- Fix `webhooks.triggerTestWebhook()` sending the wrong field name on the wire. `POST /webhooks/trigger` requires `entityId`, but the SDK was sending `resourceId`, which the API doesn't recognize — every call failed validation.

  - `TriggerWebhookRequest.entityId` is now the primary field
  - `resourceId` is kept as a **deprecated** fallback: still accepted, still works (mapped to `entityId` before the request is sent), but logs a console warning and will be removed in a future version
  - `afriex_trigger_test_webhook` (mcp-server) gained the `entityId` input, with `resourceId` kept as the same deprecated fallback

- Updated dependencies
  - @afriex/core@2.0.0
  - @afriex/customers@2.0.0
  - @afriex/transactions@2.0.0
  - @afriex/payment-methods@3.0.0
  - @afriex/balance@1.4.0
  - @afriex/webhooks@1.5.0
  - @afriex/checkout@2.0.1
  - @afriex/rates@1.4.1

## 2.0.0

### Major Changes

- Align the SDK with the current Afriex API contract.

  - update checkout session types and validation to the hosted checkout payload
  - fix virtual account and pool account request and response shapes
  - support SWAP transaction semantics, transaction filters, and missing status values
  - allow optional rate filters, expose customer list filters, and add checkout session webhook events
  - refresh public docs and examples to match the corrected API surface

### Patch Changes

- Updated dependencies
  - @afriex/checkout@2.0.0
  - @afriex/payment-methods@2.0.0
  - @afriex/transactions@1.4.0
  - @afriex/rates@1.4.0
  - @afriex/webhooks@1.4.0
  - @afriex/customers@1.4.0

## 1.2.0

### Minor Changes

- Migrate to full ESM

  - Switch `module`/`moduleResolution` to `NodeNext` in TypeScript config
  - Add `"type": "module"` to all packages
  - Replace axios with ky (ESM-native HTTP client based on Fetch API)
  - Add `.js` extensions to all relative imports
  - Replace Jest with Vitest for ESM-native testing
  - Drop `"require"` from package exports (ESM-only)

### Patch Changes

- Updated dependencies
  - @afriex/core@1.2.0
  - @afriex/balance@1.2.0
  - @afriex/customers@1.2.0
  - @afriex/transactions@1.2.0
  - @afriex/payment-methods@1.2.0
  - @afriex/rates@1.2.0
  - @afriex/webhooks@1.2.0

## 1.1.0 (2026-04-09)

### Breaking Changes

- Bumped `@afriex/transactions` to 1.1.0 — `CreateTransactionRequest` is now a union type; `sourceAmount` is required
- Bumped `@afriex/rates` to 1.1.0 — `RatesResponse` no longer has a `data` wrapper
- Bumped `@afriex/payment-methods` to 1.1.0 — `GetVirtualAccountParams` is now a union type

See individual package changelogs for full details.

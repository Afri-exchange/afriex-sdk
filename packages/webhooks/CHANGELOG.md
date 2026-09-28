# @afriex/webhooks

## 3.0.0

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

- d4d9454: Reconcile transaction types with the Business API docs.

  - `destinationAmount` is now optional on WITHDRAW and DEPOSIT. Sending `sourceAmount` alone lets the API derive the destination amount at the live forward rate. The validator now requires at least one of the two amounts.
  - `TransactionWebhookData.meta` is now the named `TransactionWebhookMeta` and types `failureReason`.
  - `COMPLETED` added to `TransactionStatus` and `TransactionWebhookStatus`, marked deprecated: it is not part of the published API.

- d4d9454: Type the webhook payloads the API reference documents.

  - **New event: `POOL_DEPOSIT_REQUEST.REJECTED`.** Sent when a pool-account deposit is rejected in review. `WebhookPayload` gains `PoolDepositRequestWebhookPayload`, whose `data` carries `transactionId`, `reference`, `amount`, `currency`, `rejectionReason` and `resubmissionRequired`. A `switch` over `event.event` that has no `default` branch needs a case for it.
  - **`rate` and `fee` on transaction events.** Both sit at the top level of `data`, beside the amounts, as the reference documents.
  - `TransactionWebhookStatus` gains `RFI_REQUESTED`.
  - `CheckoutSessionWebhookData` types its ten documented fields. It was an open map of unknown values, and still accepts keys it does not name.
  - `CustomerWebhookData` gains `meta`, `createdAt` and `updatedAt`.
  - `verify()` and `verifyAndParse()` accept the raw body as a `Buffer` as well as a string.
  - `TriggerableWebhookEventType` names the events the sandbox trigger can fire. `TriggerWebhookRequest.event` uses it, so the new pool event cannot be passed to `triggerTestWebhook()`, which the API rejects with 400.

### Patch Changes

- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
  - @afriex/core@2.2.0

## 2.0.0

### Major Changes

- **Breaking:** `triggerTestWebhook()` returns the real response shape.

  It declared `{ success, message? }`, which the API never sends. The response is an
  envelope: `TriggerWebhookResponse` is `{ data: TriggerWebhookResult }`, where
  `TriggerWebhookResult` is `{ queued, event, entityId, deliveryUrl? }`.

  Read `result.data.queued` in place of `result.success`.

## 1.5.1

### Security Patch Changes

- Rebuild against TypeScript 7 and refresh build tooling.

  The build toolchain moves from TypeScript 5.9.3 to 7.0.2 and `@types/node` from 22.x
  to 26.x. TypeScript 7 no longer auto-discovers hoisted `@types` packages through
  pnpm's isolated `node_modules`, so the shared tsconfig now sets `"types": ["node"]`
  explicitly. No public API changes — the `typescript >=5.0.0` peer range is unchanged
  and consumers on TypeScript 5 are unaffected.

- Updated dependencies
  - @afriex/core@2.0.1

## 1.5.0

### Minor Changes

- Fix drift between the SDK and the current Afriex Business API, and add the endpoints that were missing entirely.

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

- Fix `webhooks.triggerTestWebhook()` sending the wrong field name on the wire. `POST /webhooks/trigger` requires `entityId`, but the SDK was sending `resourceId`, which the API doesn't recognize — every call failed validation.

  - `TriggerWebhookRequest.entityId` is now the primary field
  - `resourceId` is kept as a **deprecated** fallback: still accepted, still works (mapped to `entityId` before the request is sent), but logs a console warning and will be removed in a future version
  - `afriex_trigger_test_webhook` (mcp-server) gained the `entityId` input, with `resourceId` kept as the same deprecated fallback

### Patch Changes

- Updated dependencies
  - @afriex/core@2.0.0

## 1.4.0

### Minor Changes

- Align the SDK with the current Afriex API contract.

  - update checkout session types and validation to the hosted checkout payload
  - fix virtual account and pool account request and response shapes
  - support SWAP transaction semantics, transaction filters, and missing status values
  - allow optional rate filters, expose customer list filters, and add checkout session webhook events
  - refresh public docs and examples to match the corrected API surface

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

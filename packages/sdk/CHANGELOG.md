# @afriex/sdk

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
  - @afriex/balance@2.0.0
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

# @afriex/mcp-server

## 1.2.1

### Security Patch Changes

- Update `jose` to 6.2.8 and `@modelcontextprotocol/sdk` to 1.30.0.

  jose 6.2.8 splits the local and remote JWKS resolvers into distinct types whose
  `jwks()` signatures differ, so neither is assignable to the other. The internal
  `JwksGetter` type is now a union of both — the resolver is only ever passed to
  `jwtVerify` as a key-resolution function, so no behaviour changes.

  `better-sqlite3` intentionally stays on 12.x: the 13.x line ships no prebuilt
  binaries, which forces a node-gyp source build on every install.

- Updated dependencies
  - @afriex/sdk@3.0.1

## 1.2.0

### Minor Changes

- Add structured output (MCP `outputSchema`/`structuredContent`) to every tool, and align tool input/output schemas with the current `@afriex/sdk` v3 contract.

  - Every tool now declares an `outputSchema` and returns `structuredContent` alongside its text `content`, built from a new `src/schemas/output.ts` (reconstructed to match the SDK's current response shapes, e.g. `Customer.name` instead of `fullName`, the expanded `Transaction`/`PaymentMethod` fields, etc.)
  - Added `afriex_resolve_institution_code`, wrapping `paymentMethods.resolveInstitutionCode()` — previously unexposed
  - `afriex_create_payment_method` now accepts `VIRTUAL_BANK_ACCOUNT` and `ACH_BANK_ACCOUNT` channels
  - `afriex_get_institutions` now accepts the full channel set (`SWIFT`, `UPI`, `INTERAC`, `WE_CHAT` in addition to `BANK_ACCOUNT`/`MOBILE_MONEY`)
  - `afriex_list_payment_methods` gained `channel`, `currencies`, `capabilities`, and `status` filters
  - `afriex_get_pool_account` gained the optional `customerId` param
  - `afriex_list_virtual_accounts`/`afriex_create_virtual_account` gained the optional `reference` param
  - `afriex_get_balance`'s `currencies` is now optional, matching `BalanceService.getBalance()` — omit it to fetch every supported currency
  - `afriex_create_checkout_session`'s `channels` now accepts `CARD`

- Fix `webhooks.triggerTestWebhook()` sending the wrong field name on the wire. `POST /webhooks/trigger` requires `entityId`, but the SDK was sending `resourceId`, which the API doesn't recognize — every call failed validation.

  - `TriggerWebhookRequest.entityId` is now the primary field
  - `resourceId` is kept as a **deprecated** fallback: still accepted, still works (mapped to `entityId` before the request is sent), but logs a console warning and will be removed in a future version
  - `afriex_trigger_test_webhook` (mcp-server) gained the `entityId` input, with `resourceId` kept as the same deprecated fallback

## 1.1.0

### Minor Changes

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

- Updated dependencies
  - @afriex/sdk@3.0.0

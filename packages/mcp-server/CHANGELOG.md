# @afriex/mcp-server

## 2.1.0

### Minor Changes

- d4d9454: Bring the MCP server in line with the SDK and the API.

  **Fixed**

  - Tool results are no longer rejected when the API returns a field the output schema does not list. Every tool passed its schema's `.shape`, which dropped the setting that allows extra fields. A client that validates structured output, as the official MCP client does, then refused the result: `afriex_create_customer` failed this way once the API began returning `reference`, after the customer had been created.
  - `page` accepts `0`. Pages are zero-based, so the first page could not be requested. `limit` is capped at `100`, the most the API returns.
  - `afriex_create_transaction` takes `sourceAmount` or `destinationAmount`, as a string or a number. It required `sourceAmount` and refused numbers.
  - `afriex_get_crypto_wallet` no longer requires `customerId`. Without it, the wallet is the business's own.
  - `meta.invoice` is described as the key of an uploaded file, not a Base64 document.
  - The status and channel lists in `afriex_list_transactions` match the API: `RFI_REQUESTED` and eight channels were missing.

  **Added**

  - 21 tools for the endpoints the SDK gained: pool-account payment proofs, settlement advices, the two sandbox simulations, upload URLs, payment batches and SME registration. The server now has 51.
  - `afriex_create_transaction` accepts `meta.settlement`, `correspondentBankName` and `correspondentBankAccountNumber`.
  - `afriex_list_virtual_accounts` accepts `country` and `amount`.
  - A failed tool call says why: an API error carries its status and error code, and a validation error names each field.

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

- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
  - @afriex/sdk@5.0.0

## 2.0.0

### Major Changes

- Track the SDK response-shape corrections.

  **Breaking:** two tools change the shape of their `structuredContent`. Clients
  reading them need updating:

  - `afriex_get_crypto_wallet` returns `{ id, addresses }` — one wallet with an address
    per network — in place of `{ data, total, page }`
  - `afriex_trigger_test_webhook` returns `{ queued, event, entityId, deliveryUrl }` in
    place of `{ success, message }`

  Fixes `afriex_list_institutions`, which failed its own output validation on every
  call: `institutionSchema` required `institutionId`, a field the institution directory
  never returns. The field is dropped from the schema, and the `institutionId` hint on
  `afriex_create_payment_method` no longer claims it comes from the listing — it is a
  reference you supply.

  The SDK now declares the API's `{ data }` envelopes, so the affected tools unwrap at
  their own boundary and the remaining tool output schemas stay flat. Schemas also
  updated for `institutionBranch`, `resolveAccount`'s institution fields,
  `Transaction.fee`, `CheckoutSession.channels`, and the move of KYC documents to
  `meta.kyc.data`.

  `afriex_create_checkout_session` now actually applies the `[VIRTUAL_BANK_ACCOUNT]`
  default its description has always promised; previously it forwarded `undefined` and
  the API rejected the request.

- Updated dependencies
  - @afriex/sdk@4.1.0

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

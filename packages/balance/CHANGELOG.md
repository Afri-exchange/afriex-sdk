# @afriex/balance

## 2.1.0

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

### Patch Changes

- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
  - @afriex/core@2.2.0

## 2.0.0

### Major Changes

- **Breaking:** `TopUpTransaction.destinationId` is now optional.

  It was declared as a required `string`. The API reference shows it present but empty
  on a business top-up, and the sandbox omits the key altogether across every currency
  tested (USD, NGN, GBP, GHS, KES, EUR, CAD). Optional is the only shape true of both.
  A top-up credits the business wallet rather than a payment method, so there is nothing
  for it to point at — `customerId` is empty for the same reason, and is now documented
  as such.

- Add the `channel` field to `TopUpTransaction`.

  Top-up responses report a `channel` (`ADMIN` in sandbox) that the type never declared.

## 1.4.1

### Security Patch Changes

- Rebuild against TypeScript 7 and refresh build tooling.

  The build toolchain moves from TypeScript 5.9.3 to 7.0.2 and `@types/node` from 22.x
  to 26.x. TypeScript 7 no longer auto-discovers hoisted `@types` packages through
  pnpm's isolated `node_modules`, so the shared tsconfig now sets `"types": ["node"]`
  explicitly. No public API changes — the `typescript >=5.0.0` peer range is unchanged
  and consumers on TypeScript 5 are unaffected.

- Updated dependencies
  - @afriex/core@2.0.1

## 1.4.0

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
  - @afriex/core@2.0.0

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

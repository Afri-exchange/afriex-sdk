# @afriex/checkout

## 3.1.0

### Minor Changes

- d4d9454: Stop rejecting requests the API documents and accepts. Each change was confirmed against the sandbox.

  - **Checkout accepts `CARD`.** `createSession()` rejected it client-side although the API lists it and returns `201`. `channels` is a cap: channels the currency cannot collect on are dropped, and `session.channels` reports what the payer will be offered.
  - **Payment method creation is validated per channel.** `UPI` and `INTERAC` no longer require `institution`, and `VIRTUAL_BANK_ACCOUNT` requires none of `accountName`, `accountNumber` or `institution`. `CreatePaymentMethodRequest` is now a union keyed on `channel`; the per-channel shapes are exported. `customerId` stays required: the reference marks it optional, but the sandbox answers `404 BUSINESS_CUSTOMER_NOT_FOUND` without it.
  - **Transactions can be created from either amount.** `sourceAmount` is no longer required by the type, so a withdrawal, deposit or swap can send `destinationAmount` alone. Amounts accept a number or a numeric string (`TransactionAmount`).
  - `TransactionStatus.COMPLETED` is marked deprecated. It is not part of the published API.

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
  - @afriex/core@2.2.0

## 3.0.1

### Patch Changes

- Correct the shipped `afriex-checkout` skill on `channels`.

  3.0.0 made `channels` required, but the skill guide that ships with the package still
  told readers to "omit `channels` entirely to let Afriex offer everything enabled for
  the account" — a request the API rejects. There is no such default; the rails must be
  named explicitly.

## 3.0.0

### Major Changes

- **Breaking:** `channels` is required on `CreateCheckoutSessionRequest`.

  The field was declared optional but the API rejects a request that omits it with
  `channels is required`. It is now required and validated client-side as present and
  non-empty, so an omission fails immediately instead of costing a round trip.

  `CheckoutSession` gains `channels`, which the API echoes back on the created session.

## 2.0.2

### Security Patch Changes

- Rebuild against TypeScript 7 and refresh build tooling.

  The build toolchain moves from TypeScript 5.9.3 to 7.0.2 and `@types/node` from 22.x
  to 26.x. TypeScript 7 no longer auto-discovers hoisted `@types` packages through
  pnpm's isolated `node_modules`, so the shared tsconfig now sets `"types": ["node"]`
  explicitly. No public API changes — the `typescript >=5.0.0` peer range is unchanged
  and consumers on TypeScript 5 are unaffected.

- Updated dependencies
  - @afriex/core@2.0.1

## 2.0.1

### Patch Changes

- Updated dependencies
  - @afriex/core@2.0.0

## 2.0.0

### Major Changes

- Align the SDK with the current Afriex API contract.

  - update checkout session types and validation to the hosted checkout payload
  - fix virtual account and pool account request and response shapes
  - support SWAP transaction semantics, transaction filters, and missing status values
  - allow optional rate filters, expose customer list filters, and add checkout session webhook events
  - refresh public docs and examples to match the corrected API surface

## 1.0.0

### Major Changes

- Initial release of checkout package
- Added `CheckoutService` with `createSession` method
- Support for hosted payment checkout sessions
- Comprehensive validation for checkout requests

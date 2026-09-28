# @afriex/rates

## 2.0.2

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

## 2.0.1

### Patch Changes

- Fix an inverted pitfall in the shipped `afriex-rates` skill.

  2.0.0 made `getRate()` throw instead of returning a `"0"` rate, but the skill guide
  that ships with the package still described the old behaviour — its "HIGH" pitfall
  warned against trusting `getRate` to throw and told readers to guard with
  `parseFloat(rate) <= 0`. That advice became exactly backwards: the guard is now dead
  code and the real hazard is an uncaught rejection in a payout path. Rewritten, with a
  note for anyone still carrying the old guard.

## 2.0.0

### Major Changes

- **Breaking:** `getRate()` throws instead of returning a `"0"` rate.

  The `?? "0"` fallback implied an unknown pair yields `"0"`. Unsupported symbols are
  rejected by the API with a 400 before the fallback can fire, and every supported pair
  resolves — so the only way to reach it was a genuinely unpublished rate, where `"0"`
  would silently zero out any `convert()` built on it. It now throws `AfriexError`.

## 1.4.2

### Security Patch Changes

- Rebuild against TypeScript 7 and refresh build tooling.

  The build toolchain moves from TypeScript 5.9.3 to 7.0.2 and `@types/node` from 22.x
  to 26.x. TypeScript 7 no longer auto-discovers hoisted `@types` packages through
  pnpm's isolated `node_modules`, so the shared tsconfig now sets `"types": ["node"]`
  explicitly. No public API changes — the `typescript >=5.0.0` peer range is unchanged
  and consumers on TypeScript 5 are unaffected.

- Updated dependencies
  - @afriex/core@2.0.1

## 1.4.1

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

## 1.1.0 (2026-04-09)

### Breaking Changes

- **`RatesResponse`** no longer has a `data` wrapper — `rates` and `updatedAt` are now top-level fields
  - Before: `response.data.rates`, `response.data.updatedAt`
  - After: `response.rates`, `response.updatedAt`

### Fixes

- `RateService.getRates()` now correctly unwraps the API `{ data }` envelope, consistent with all other services
- `RateService.getRate()` updated to use unwrapped response
- Added JSDoc comments to `RatesResponse` and `GetRatesParams` fields

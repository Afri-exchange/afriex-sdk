---
"@afriex/core": patch
"@afriex/rates": patch
"@afriex/checkout": patch
"@afriex/mcp-server": patch
---

Deprecate exports that do not describe the API, and correct two guides.

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

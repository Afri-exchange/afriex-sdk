# @afriex/rates

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

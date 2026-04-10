# @afriex/sdk

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

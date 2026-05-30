# @afriex/payment-methods

## 2.0.0

### Major Changes

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

- **`GetVirtualAccountParams`** is now a discriminated union type:
  - `GetStandardVirtualAccountParams` — `type?: "VIRTUAL_ACCOUNT"`, all fields optional
  - `GetPoolAccountParams` — `type: "POOL_ACCOUNT"`, `country`, `amount`, and `customerId` are required

### Fixes

- Added missing `type`, `country`, and `reference` parameters to virtual account params to match API spec
- Added JSDoc comments to all type fields

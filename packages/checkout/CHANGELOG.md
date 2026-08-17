# @afriex/checkout

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

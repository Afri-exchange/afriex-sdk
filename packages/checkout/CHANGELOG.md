# @afriex/checkout

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

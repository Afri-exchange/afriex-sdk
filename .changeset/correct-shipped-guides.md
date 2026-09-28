---
"@afriex/customers": patch
"@afriex/payment-methods": patch
"@afriex/transactions": patch
"@afriex/sdk": patch
---

Correct the READMEs and skill guides that ship with the packages. Every TypeScript example in them now compiles against the SDK.

- Pagination examples started at page 1, which skips the first page. Pages start at 0.
- Mobile money examples sent `accountNumber` with a leading `+`, which the API rejects. It takes digits only.
- The payment-methods guide said virtual accounts and pool accounts answer 403 in the sandbox. Both work there.
- The payment-methods guide recommended list filters the API rejects with 422, and said mobile money resolves without an `institutionCode`. It does not.
- The customers guide passed `BVN` and `NIN` to `updateKyc()`. A BVN goes through `verify()`, and `NIN` is not a document type.
- The transactions guide now covers the `409 DUPLICATE_REQUEST` a reused idempotency key returns, and the review statuses.
- The `@afriex/sdk` quick start created a checkout session without the required `channels`.

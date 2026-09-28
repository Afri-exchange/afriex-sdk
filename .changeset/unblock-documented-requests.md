---
"@afriex/checkout": minor
"@afriex/payment-methods": minor
"@afriex/transactions": minor
"@afriex/sdk": minor
---

Stop rejecting requests the API documents and accepts. Each change was confirmed against the sandbox.

- **Checkout accepts `CARD`.** `createSession()` rejected it client-side although the API lists it and returns `201`. `channels` is a cap: channels the currency cannot collect on are dropped, and `session.channels` reports what the payer will be offered.
- **Payment method creation is validated per channel.** `UPI` and `INTERAC` no longer require `institution`, and `VIRTUAL_BANK_ACCOUNT` requires none of `accountName`, `accountNumber` or `institution`. `CreatePaymentMethodRequest` is now a union keyed on `channel`; the per-channel shapes are exported. `customerId` stays required: the reference marks it optional, but the sandbox answers `404 BUSINESS_CUSTOMER_NOT_FOUND` without it.
- **Transactions can be created from either amount.** `sourceAmount` is no longer required by the type, so a withdrawal, deposit or swap can send `destinationAmount` alone. Amounts accept a number or a numeric string (`TransactionAmount`).
- `TransactionStatus.COMPLETED` is marked deprecated. It is not part of the published API.

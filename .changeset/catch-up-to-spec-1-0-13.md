---
"@afriex/core": minor
"@afriex/customers": minor
"@afriex/transactions": minor
"@afriex/payment-methods": minor
"@afriex/balance": minor
"@afriex/sdk": minor
---

Catch up with version 1.0.13 of the API reference. Everything here is additive.

**@afriex/transactions**

- `TransactionStatus` gains `RFI_REQUESTED`, a review state to treat as non-terminal like `IN_REVIEW`.
- `TransactionChannel` gains `POOL_ACCOUNT`, `PAYMENT_LINQ` and `ADMIN`.
- `TransactionFailureCode` gains `AFX_ACCOUNT_CLOSED` and `AFX_NAME_MISMATCH`.
- `TransactionMeta.settlement` (`"spot" | "request"`), and `correspondentBankName` / `correspondentBankAccountNumber` on the create request. The pair is validated as sent together, and `settlement: "request"` as WITHDRAW only.
- `meta.invoice` is documented as what it is: the object key of an uploaded invoice, not a Base64 document.
- `ListTransactionsParams.status` is typed as `TransactionListStatus`, which leaves out `COMPLETED`. The API answers 422 for it.

**@afriex/customers**

- `Customer.reference`, the value to supply as the pool-account reference on a payment proof.

**@afriex/payment-methods**

- `PaymentMethod.bankAddress` and the `PaymentMethodBankAddress` type.
- `ListVirtualAccountsParams` gains `country` and `amount`.
- `getPoolAccount()`, which returns the single pool account for a country. `listPoolAccounts()` is deprecated in its favour.
- Virtual accounts and pool accounts are no longer described as production only. Both answer in the sandbox.

**@afriex/core**

- `AfriexErrorCode` gains the codes the reference documents and the SDK lacked: `DUPLICATE_REQUEST`, `EMAIL_ALREADY_EXISTS`, `PHONE_NUMBER_ALREADY_EXISTS`, `EXTERNAL_REQUEST_ERROR`, `RATE_LIMIT_ERROR`, `OTP_INCORRECT`, `INVALID_TRANSACTION_CHANNEL`, `UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY`, `VIRTUAL_ACCOUNT_PENDING_COMPLIANCE_REVIEW` and the three `INVALID_BUSINESS_*_ID` codes. It also gains four seen in the sandbox: `BAD_REQUEST_ERROR`, `INVALID_BUSINESS_PAYMENT_METHOD_REQUEST`, `PROCESSOR_NOT_FOUND` and `TRANSACTION_AMOUNT_TOO_SMALL`.
- `RATE_LIMIT_EXCEEDED` is deprecated. The API sends `RATE_LIMIT_ERROR`.
- `ApiError` reads the `{ message }` body that environment-restricted endpoints return with a 403, and reports those as `AfriexErrorCode.FORBIDDEN`. Before, they surfaced as "An API error occurred" with no code.

**@afriex/balance**

- `TopUpTransaction` gains `sourceId`, `merchantReference`, `rate` and `fee`, and its status union now covers every transaction status.

**@afriex/sdk**

- Re-exports the new types, plus `TopUpParams`, `TopUpTransaction` and the other top-up types, and `CreateCheckoutSessionResponse`.
- `TransactionStatus` is exported as a value as well as a type, along with `DEFAULT_TRANSACTION_TYPE`.

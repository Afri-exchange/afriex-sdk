---
"@afriex/customers": major
"@afriex/payment-methods": major
"@afriex/transactions": major
"@afriex/webhooks": major
"@afriex/sdk": major
"@afriex/mcp-server": minor
---

**Breaking:** stop offering values the API rejects. Every removal below was confirmed against the sandbox, and each one turns a runtime `4xx` into a compile error.

**@afriex/customers**

- `UpdateCustomerKycRequest` no longer accepts `COUNTRY`, `PHONE` or `BVN`. The API answers `400 INVALID_KYC_DOCUMENT_TYPE` for all three, and rejects the whole request when one is mixed in with valid types. `updateKyc()` now throws a `ValidationError` that says where each value belongs: a BVN goes through `verify()`, a phone number through `update()`. `KycDocumentType` keeps all 21 values, since they can still be read back from `meta.kyc.data`; `UpdatableKycDocumentType` names the 18 that can be written.

**@afriex/payment-methods**

- `CreatablePaymentChannel` drops `ALIPAY` and `PAYBILL_TILL`. Create Alipay on `WE_CHAT` with `institutionCode` and `institutionName` set to `ALIPAY`.
- `InstitutionListChannel` is now `BANK_ACCOUNT | SWIFT | MOBILE_MONEY | ACH_BANK_ACCOUNT`. `UPI`, `INTERAC` and `WE_CHAT` answer `400 INVALID_TRANSACTION_CHANNEL`. `ACH_BANK_ACCOUNT` is new: the sandbox serves the US routing directory for it.
- `ListPaymentMethodsParams` filters are typed to what the endpoint accepts: `channel` takes the 8 values of `PaymentMethodListChannel`, `status` takes `active` and `pending`, `capabilities` takes `WITHDRAW`. Anything else answers 422.
- `ResolveAccountParams.institutionCode` is required. The API rejects a request without it for `MOBILE_MONEY` as well as `BANK_ACCOUNT`.
- `CreateVirtualAccountParams` drops `country` and `reference`, which the API rejects as not allowed, and types `label` as `VirtualAccountLabel`.
- `createVirtualAccount()` returns `PaymentMethod | null`. It is `null` when the issuing bank opens the account after the request returns; the account then arrives by the `PAYMENT_METHOD.CREATED` webhook. Before, the caller got an empty object typed as a full `PaymentMethod`.
- `ResolvedAccount` drops `recipientEmail`, `recipientPhone` and `recipientAddress`, which the endpoint never returns.

**@afriex/transactions**

- A `SWAP` takes exactly one of `sourceAmount` or `destinationAmount`, in the type (`SwapAmount`) and in the validator. The API rejects a swap that sends both.

**@afriex/webhooks**

- On `PaymentMethodWebhookData`, `institution`, `transaction`, `recipient`, `accountName` and `accountNumber` are optional. The API omits empty fields, and card payloads carry none of them. Readers need a guard. The type gains the card fields, `currency`, `capabilities` and `reference`.

**@afriex/mcp-server**

- Tool schemas follow the same narrowing, so a model is no longer offered values that fail. `afriex_create_virtual_account` reports `pending: true` when the account is opened later.

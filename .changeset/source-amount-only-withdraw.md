---
"@afriex/transactions": minor
"@afriex/webhooks": minor
"@afriex/sdk": minor
---

Reconcile transaction types with the Business API docs.

- `destinationAmount` is now optional on WITHDRAW and DEPOSIT. Sending `sourceAmount` alone lets the API derive the destination amount at the live forward rate. The validator now requires at least one of the two amounts.
- `TransactionWebhookData.meta` is now the named `TransactionWebhookMeta` and types `failureReason`.
- `COMPLETED` added to `TransactionStatus` and `TransactionWebhookStatus`, marked deprecated: it is not part of the published API.

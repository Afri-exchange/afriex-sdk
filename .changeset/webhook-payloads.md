---
"@afriex/webhooks": minor
"@afriex/sdk": minor
---

Type the webhook payloads the API reference documents.

- **New event: `POOL_DEPOSIT_REQUEST.REJECTED`.** Sent when a pool-account deposit is rejected in review. `WebhookPayload` gains `PoolDepositRequestWebhookPayload`, whose `data` carries `transactionId`, `reference`, `amount`, `currency`, `rejectionReason` and `resubmissionRequired`. A `switch` over `event.event` that has no `default` branch needs a case for it.
- **`rate` and `fee` on transaction events.** Both sit at the top level of `data`, beside the amounts, as the reference documents.
- `TransactionWebhookStatus` gains `RFI_REQUESTED`.
- `CheckoutSessionWebhookData` types its ten documented fields. It was an open map of unknown values, and still accepts keys it does not name.
- `CustomerWebhookData` gains `meta`, `createdAt` and `updatedAt`.
- `verify()` and `verifyAndParse()` accept the raw body as a `Buffer` as well as a string.
- `TriggerableWebhookEventType` names the events the sandbox trigger can fire. `TriggerWebhookRequest.event` uses it, so the new pool event cannot be passed to `triggerTestWebhook()`, which the API rejects with 400.

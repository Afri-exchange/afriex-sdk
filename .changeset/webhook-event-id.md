---
"@afriex/webhooks": minor
"@afriex/sdk": minor
---

Type the event `id` and `createdAt` that every webhook body now carries. Everything here is additive.

**@afriex/webhooks**

- Every webhook payload type (`CustomerWebhookPayload`, `PaymentMethodWebhookPayload`, `TransactionWebhookPayload`, `CheckoutSessionWebhookPayload` and `PoolDepositRequestWebhookPayload`) extends the new `WebhookEnvelope`, which adds `id` and `createdAt`. The API sets both once per event, repeats them on every retry, and covers them with the signature, so `verifyAndParse()` now returns them typed. Store `id` and skip a delivery whose `id` you have processed: that handles retries and replays.
- `CheckoutSessionWebhookData.afriexTransactionId` and `paidAt` are deprecated. The API never sends them: `CHECKOUT_SESSION.CREATED` is sent once, when the session is created. Find the session's deposit by listing transactions with `reference` set to the `merchantReference`.
- The README, the bundled skill and the docs show the new fields, and the skill's duplicate guard keys on `event.id`.

**@afriex/sdk**

- Re-exports `WebhookEnvelope`.

# @afriex/sme-registration

## 1.0.0

### Major Changes

- d4d9454: Add the 19 operations the API reference documents and the SDK lacked. Everything here is additive. The three new packages are released as 1.0.0.

  **@afriex/media** (new)

  - `MediaService`, on the client as `afriex.media`.
  - `upload()` requests an upload URL and sends the file to it, then returns the `key` that other requests take. It accepts a `Blob`, an `ArrayBuffer` or a `Uint8Array`. The upload goes to the storage host without the API key.
  - `createUploadUrl()` returns `{ url, key, expiresIn }` for when something else sends the file.

  **@afriex/payment-batches** (new)

  - `PaymentBatchService`, on the client as `afriex.paymentBatches`: `create`, `get`, `list`, `update`, `delete`, `addRecipient`, `addRecipients`, `listRecipients`, `updateRecipient`, `removeRecipient`, `withdraw` and `listSessions`.
  - `withdraw()` without a `sessionId` pays every recipient again. Pass the `sessionId` of a run to retry only the payouts that failed in it.
  - `addRecipient()` and `updateRecipient()` return the saved account. Its `id` is the recipient's `paymentMethodId`; the `recipientId` that update and remove take comes from `listRecipients()`.
  - A recipient on `UPI` or `INTERAC` needs no `institution`, as on a payment method. The reference marks it required for every channel; the sandbox accepts the recipient without it.

  **@afriex/sme-registration** (new)

  - `SmeRegistrationService`, on the client as `afriex.smeRegistration`: `initiate`, `confirmOtp`, `submit` and `getStatus`.
  - Written from the API reference alone. The endpoints need the `COMPLIANCE.KYB.*` key permissions, so they were not run against the sandbox. The reference does not list the company detail fields of the `SUBMIT` step, so `submit()` sends the object it is given.

  **@afriex/transactions**

  - `submitPoolAccountProof()` submits proof of a deposit made to the pool account and returns the deposit, created `IN_REVIEW`.
  - `getAdvice()` returns the settlement advice of a withdrawal created with `meta.settlement: "request"`.
  - `simulate()` completes a pending sandbox transaction with the outcome you choose. Sandbox only.

  **@afriex/payment-methods**

  - `simulateTransfer()` credits a bank transfer into a sandbox virtual account. Sandbox only.

  **@afriex/core**

  - `AfriexErrorCode` gains two codes seen in the sandbox: `INVALID_BUSINESS_PAYMENT_BATCH_REQUEST` and `NOT_FOUND_ERROR`.

  **@afriex/sdk**

  - The client gains `media`, `paymentBatches` and `smeRegistration`, and the package re-exports the three services and their types.

### Patch Changes

- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
- Updated dependencies [d4d9454]
  - @afriex/core@2.2.0

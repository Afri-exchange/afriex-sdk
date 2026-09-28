import { z } from "zod";

/**
 * Structured output schemas for tool results (MCP `outputSchema` /
 * `structuredContent`). Every object schema uses `.passthrough()` so an
 * Afriex API response carrying extra fields we haven't modeled yet still
 * validates instead of breaking the tool call.
 *
 * Pass the schema itself to `registerTool`, never its `.shape`. A shape is
 * rebuilt into a plain object schema, which drops `.passthrough()` and makes
 * the tool reject any response field it does not list.
 *
 * Field shapes are kept in lockstep with the `@afriex/*` SDK response
 * types (`Customer`, `Transaction`, `PaymentMethod`, etc.) — when those
 * change, update the matching schema here.
 */

/**
 * `CallToolResult.structuredContent` is typed as `Record<string, unknown>`,
 * which named SDK response interfaces (e.g. `Customer`, `Transaction`) don't
 * structurally satisfy without an explicit index signature. The actual shape
 * is still enforced at runtime by the tool's `outputSchema`; this only tells
 * TypeScript what we already know to be true.
 */
export function toStructured<T extends object>(value: T): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

// ---- Customers ----

export const customerSchema = z
  .object({
    customerId: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    countryCode: z.string(),
    /** Supply it as the pool-account reference on a payment proof. */
    reference: z.string().optional(),
    /** KYC documents live at meta.kyc.data; there is no top-level kyc field. */
    meta: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const customerListOutputSchema = z
  .object({
    data: z.array(customerSchema),
    page: z.number(),
    total: z.number(),
  })
  .passthrough();

export const deletedOutputSchema = z
  .object({
    deleted: z.literal(true),
    id: z.string(),
  })
  .passthrough();

// ---- Payment methods ----

export const institutionSchema = z
  .object({
    /** Documented as optional; rarely populated. Match on institutionCode. */
    institutionId: z.string().optional(),
    institutionName: z.string(),
    institutionCode: z.string(),
    institutionAddress: z.string().optional(),
    institutionBranch: z.string().optional(),
    /** Mandatory for USD (SWIFT) payout payment methods. */
    correspondentBankName: z.string().optional(),
    correspondentBankAccountNumber: z.string().optional(),
  })
  .passthrough();

export const institutionListOutputSchema = z
  .object({
    institutions: z.array(institutionSchema),
  })
  .passthrough();

export const resolveAccountOutputSchema = z
  .object({
    recipientEmail: z.string().optional(),
    recipientPhone: z.string().optional(),
    recipientAddress: z.string().optional(),
    recipientName: z.string().optional(),
    institutionName: z.string().optional(),
    institutionCode: z.string().optional(),
  })
  .passthrough();

export const resolveInstitutionCodeOutputSchema = z
  .object({
    bankName: z.string().optional(),
  })
  .passthrough();

const cardExpirationSchema = z
  .object({
    month: z.number(),
    year: z.number(),
  })
  .passthrough();

export const paymentMethodSchema = z
  .object({
    paymentMethodId: z.string(),
    customerId: z.string(),
    /** Identifier to reconcile incoming deposits against. */
    reference: z.string().optional(),
    channel: z.string(),
    countryCode: z.string(),
    /** ISO 4217 currency. Prefer this over inferring currency from countryCode. */
    currency: z.string().optional(),
    /** Operations this payment method is enabled for, e.g. DEPOSIT, WITHDRAW. */
    capabilities: z.array(z.string()).optional(),
    /** Lifecycle status: active, pending, deleted, expired, blocked. */
    status: z.string().optional(),
    /** Present for account-shaped channels (BANK_ACCOUNT, MOBILE_MONEY, SWIFT, etc.). */
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    /** Bank routing number, present for channels that carry one (e.g. ACH). */
    routingNumber: z.string().optional(),
    /** The issuing bank's address, on a virtual account that carries one. */
    bankAddress: z.record(z.string(), z.unknown()).optional(),
    /** CARD channel only. */
    last4: z.string().optional(),
    brand: z.string().optional(),
    expiration: cardExpirationSchema.optional(),
    cardName: z.string().optional(),
    /** Dynamic virtual account fields. */
    expiresInMinutes: z.number().optional(),
    amount: z.number().optional(),
    extra: z.record(z.string(), z.unknown()).optional(),
    institution: z
      .object({
        institutionId: z.string().optional(),
        institutionName: z.string().optional(),
        institutionCode: z.string().optional(),
        institutionAddress: z.string().optional(),
        correspondentBankName: z.string().optional(),
        correspondentBankAccountNumber: z.string().optional(),
      })
      .passthrough()
      .optional(),
    recipient: z
      .object({
        recipientEmail: z.string().optional(),
        recipientPhone: z.string().optional(),
        recipientAddress: z.string().optional(),
        recipientName: z.string().optional(),
      })
      .passthrough()
      .optional(),
    transaction: z
      .object({
        transactionInvoice: z.string().optional(),
        transactionNarration: z.string().optional(),
      })
      .passthrough()
      .optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const paymentMethodListOutputSchema = z
  .object({
    data: z.array(paymentMethodSchema),
    page: z.number(),
    total: z.number(),
  })
  .passthrough();

export const cryptoWalletOutputSchema = z
  .object({
    id: z.string(),
    addresses: z.array(z.object({ address: z.string(), network: z.string() }).passthrough()),
  })
  .passthrough();

export const virtualAccountListOutputSchema = z
  .object({
    data: z.array(paymentMethodSchema),
    page: z.number(),
    total: z.number(),
  })
  .passthrough();

/**
 * A created virtual account, or `{ pending: true }` when the issuing bank opens
 * it after the request returns. Every payment method field is optional here:
 * the pending result carries none, and the sandbox omits `countryCode` and
 * `currency` on a dynamic account.
 */
export const virtualAccountCreatedOutputSchema = paymentMethodSchema
  .partial()
  .extend({ pending: z.boolean() })
  .passthrough();

export const poolAccountOutputSchema = paymentMethodSchema;

export const simulateTransferOutputSchema = z
  .object({
    /** The reference of the new deposit. */
    reference: z.string(),
  })
  .passthrough();

// ---- Payment batches ----

const paymentBatchAmountSchema = z
  .object({
    /** A string, or the number the amount was sent as. */
    value: z.union([z.string(), z.number()]),
    currencyCode: z.string(),
  })
  .passthrough();

const paymentBatchInstitutionSchema = z
  .object({
    institutionId: z.string().optional(),
    institutionName: z.string().optional(),
    institutionCode: z.string().optional(),
  })
  .passthrough();

export const paymentBatchSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sourcePaymentMethod: z
      .object({
        channel: z.string().optional(),
        currencyCode: z.string().optional(),
      })
      .passthrough(),
    meta: z.object({ memberCount: z.number().optional() }).passthrough().optional(),
  })
  .passthrough();

export const paymentBatchListOutputSchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          meta: z
            .object({
              flags: z.object({ isDeactivated: z.boolean().optional() }).passthrough().optional(),
              /** How many recipients the batch holds. */
              memberCount: z.number().optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough(),
    ),
    page: z.number(),
    total: z.number(),
  })
  .passthrough();

/**
 * The account saved for a recipient. `id` is the recipient's paymentMethodId,
 * not the recipientId that update and remove take.
 */
export const savedPaymentBatchRecipientSchema = z
  .object({
    id: z.string(),
    channel: z.string().optional(),
    countryCode: z.string().optional(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    institution: paymentBatchInstitutionSchema.optional(),
    amount: paymentBatchAmountSchema.optional(),
  })
  .passthrough();

export const paymentBatchRecipientListOutputSchema = z
  .object({
    data: z.array(
      z
        .object({
          paymentMethodId: z.string(),
          /** The recipient's id in the batch, used to update or remove it. */
          recipientId: z.string(),
          channel: z.string().optional(),
          countryCode: z.string().optional(),
          accountName: z.string().optional(),
          accountNumber: z.string().optional(),
          institution: paymentBatchInstitutionSchema.optional(),
          amount: paymentBatchAmountSchema.optional(),
        })
        .passthrough(),
    ),
    page: z.number(),
    total: z.number(),
  })
  .passthrough();

/**
 * Per-item outcomes. Adding recipients in bulk keys both maps by account
 * number; a withdrawal keys them by recipientId.
 */
export const paymentBatchOutcomesOutputSchema = z
  .object({
    successes: z.record(z.string(), z.string()),
    errors: z.record(z.string(), z.string()),
  })
  .passthrough();

export const paymentBatchSessionListOutputSchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string(),
          batchId: z.string().optional(),
          createdAt: z.string().optional(),
          meta: z
            .object({
              /** The result for each recipient, keyed by recipientId. */
              results: z.record(z.string(), z.unknown()).optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough(),
    ),
    page: z.number(),
    total: z.number(),
  })
  .passthrough();

// ---- Media ----

export const uploadUrlOutputSchema = z
  .object({
    /** The presigned URL to PUT the file to. */
    url: z.string(),
    /** The reference to pass to later requests. */
    key: z.string(),
    /** How many seconds the URL stays valid. */
    expiresIn: z.number(),
  })
  .passthrough();

// ---- SME registration ----

export const smeRegistrationOutputSchema = z
  .object({
    onboardingRequestId: z.string(),
    step: z.string().optional(),
    status: z.string().optional(),
    nextStep: z.string().nullable().optional(),
    expiresAt: z.string().optional(),
  })
  .passthrough();

export const smeRegistrationStatusOutputSchema = z
  .object({
    /** null when the business has never registered. */
    onboardingRequestId: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    /** Present once the registration has been submitted. */
    reviewStatus: z.string().optional(),
    rejectReasons: z.array(z.string()).nullable().optional(),
    isReviewStatusStale: z.boolean().optional(),
  })
  .passthrough();

// ---- Transactions ----

export const transactionFailureReasonSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  })
  .passthrough();

export const transactionSchema = z
  .object({
    transactionId: z.string(),
    customerId: z.string(),
    sourceId: z.string().optional(),
    /** Absent on SWAP transactions, which settle within the wallet and have no destination payment method. */
    destinationId: z.string().optional(),
    sourceAmount: z.string(),
    sourceCurrency: z.string(),
    destinationAmount: z.string(),
    destinationCurrency: z.string(),
    type: z.string(),
    channel: z.string().optional(),
    status: z.string(),
    /** Mirrors meta.reference from the create request. */
    merchantReference: z.string().optional(),
    /** Realized source-to-destination rate: 1 sourceCurrency = rate destinationCurrency. */
    rate: z.string().optional(),
    /** Fee charged for the transaction, denominated in sourceCurrency. */
    fee: z.string().optional(),
    meta: z
      .object({
        narration: z.string().optional(),
        invoice: z.string().optional(),
        idempotencyKey: z.string().optional(),
        reference: z.string().optional(),
        /** spot or request: which wallet a withdrawal was debited from. */
        settlement: z.string().optional(),
        /** true when a deposit needs afriex_authorize_transaction with an OTP. */
        otpRequired: z.boolean().optional(),
        failureReason: transactionFailureReasonSchema.optional(),
      })
      .passthrough()
      .optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const transactionListOutputSchema = z
  .object({
    data: z.array(transactionSchema),
    page: z.number(),
    total: z.number(),
  })
  .passthrough();

export const settlementAdviceOutputSchema = z
  .object({
    /** Download URL for the advice PDF. Valid for 5 minutes. */
    url: z.string(),
    reference: z.string(),
    /** PENDING until the withdrawal succeeds, COMPLETED afterwards. */
    status: z.string(),
    version: z.number(),
    generatedAt: z.string(),
  })
  .passthrough();

// ---- Balance ----

export const balanceOutputSchema = z
  .object({
    balances: z.record(z.string(), z.number()),
  })
  .passthrough();

export const topUpOutputSchema = transactionSchema;

// ---- Rates ----

export const ratesOutputSchema = z
  .object({
    rates: z.record(z.string(), z.record(z.string(), z.string())),
    updatedAt: z.number(),
  })
  .passthrough();

export const convertCurrencyOutputSchema = z
  .object({
    amount: z.number(),
    from: z.string(),
    to: z.string(),
    converted: z.number(),
  })
  .passthrough();

// ---- Checkout ----

export const checkoutSessionOutputSchema = z
  .object({
    checkoutUrl: z.string(),
    channels: z.array(z.string()).optional(),
  })
  .passthrough();

// ---- Webhooks ----

export const webhookVerifyOutputSchema = z
  .object({
    valid: z.boolean(),
    message: z.string(),
  })
  .passthrough();

export const webhookParsedOutputSchema = z
  .object({
    event: z.string(),
    data: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const triggerWebhookOutputSchema = z
  .object({
    queued: z.boolean(),
    event: z.string(),
    entityId: z.string(),
    deliveryUrl: z.string().optional(),
  })
  .passthrough();

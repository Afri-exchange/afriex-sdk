/**
 * Webhook types matching Afriex Business API
 */

// Customer webhook events
export type CustomerEventType =
  | "CUSTOMER.CREATED"
  | "CUSTOMER.UPDATED"
  | "CUSTOMER.DELETED";

/**
 * The customer an event is about. A `CUSTOMER.DELETED` event carries the same
 * full object as the other two: the customer's last known state.
 */
export interface CustomerWebhookData {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  /** Metadata attached to the customer. */
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerWebhookPayload {
  event: CustomerEventType;
  data: CustomerWebhookData;
}

// Payment method webhook events
export type PaymentMethodEventType =
  | "PAYMENT_METHOD.CREATED"
  | "PAYMENT_METHOD.UPDATED"
  | "PAYMENT_METHOD.DELETED";

export interface PaymentMethodWebhookData {
  paymentMethodId: string;
  channel: string;
  customerId: string;
  institution: {
    institutionId?: string;
    institutionName?: string;
    institutionCode?: string;
    institutionAddress?: string;
  };
  transaction: {
    transactionInvoice?: string;
    transactionNarration?: string;
  };
  recipient: {
    recipientEmail?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    recipientName?: string;
  };
  accountName: string;
  accountNumber: string;
  countryCode: string;
  /** Lifecycle status of the payment method. */
  status?: string;
  meta?: Record<string, unknown>;
}

export interface PaymentMethodWebhookPayload {
  event: PaymentMethodEventType;
  data: PaymentMethodWebhookData;
}

// Transaction webhook events
export type TransactionEventType =
  | "TRANSACTION.CREATED"
  | "TRANSACTION.UPDATED";

/**
 * `IN_REVIEW` and `RFI_REQUESTED` are review states: the transaction is still
 * in flight. Treat them, and any status not listed here, as non-terminal.
 *
 * `COMPLETED` is deprecated. It is not part of the published API; the terminal
 * success status is `SUCCESS`.
 */
export type TransactionWebhookStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "RETRY"
  | "UNKNOWN"
  | "SCHEDULED"
  | "CUSTOMER_ACTION_REQUIRED"
  | "REJECTED"
  | "IN_REVIEW"
  | "RFI_REQUESTED"
  | "DISPUTED"
  | "DISPUTE_RESOLVED"
  | "DISPUTE_WON"
  | "DISPUTE_LOST"
  | "DISPUTE_EVIDENCE_SUBMITTED";

/**
 * Present only when `status` is `FAILED` or `REJECTED`. Mirrors
 * `TransactionFailureReason` in `@afriex/transactions`; redeclared here so
 * this package keeps depending on `@afriex/core` alone.
 */
export interface TransactionWebhookFailureReason {
  /** Stable `AFX_*` failure code. */
  code: string;
  message: string;
  retryable: boolean;
}

export interface TransactionWebhookMeta {
  narration?: string;
  invoice?: string;
  idempotencyKey?: string;
  reference?: string;
  /** Settlement handling the transaction was created with. */
  settlement?: string;
  /** `true` when the deposit is waiting for the customer's one-time password. */
  otpRequired?: boolean;
  failureReason?: TransactionWebhookFailureReason;
  [key: string]: unknown;
}

export interface TransactionWebhookData {
  status: TransactionWebhookStatus;
  type: string;
  channel?: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  sourceId?: string;
  /** Absent on SWAP transactions, which settle within the wallet and have no destination payment method. */
  destinationId?: string;
  customerId: string;
  transactionId: string;
  /** Mirrors meta.reference from the create request. */
  merchantReference?: string;
  /** Realized source-to-destination rate: `1 sourceCurrency = rate destinationCurrency`. */
  rate?: string;
  /** Fee charged for the transaction, denominated in `sourceCurrency`. Omitted when no fee applied. */
  fee?: string;
  meta: TransactionWebhookMeta;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionWebhookPayload {
  event: TransactionEventType;
  data: TransactionWebhookData;
}

// Checkout session webhook events
export type CheckoutSessionEventType = "CHECKOUT_SESSION.CREATED";

/** The customer a checkout session was created for. */
export interface CheckoutSessionWebhookCustomer {
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  [key: string]: unknown;
}

/**
 * A hosted checkout session. `CHECKOUT_SESSION.CREATED` fires when the session
 * is created and is not a payment signal: follow `TRANSACTION.UPDATED` on the
 * transaction the session produces.
 */
export interface CheckoutSessionWebhookData {
  sessionId: string;
  /** The merchant-supplied reference for the session. */
  merchantReference: string;
  /** The session amount, in minor currency units. */
  amount: number;
  currency: string;
  expiresAt: string;
  createdAt?: string;
  /** The Afriex transaction id, once the session is paid. */
  afriexTransactionId?: string;
  /** When the session was paid. */
  paidAt?: string;
  metadata?: Record<string, string>;
  customer?: CheckoutSessionWebhookCustomer;
  [key: string]: unknown;
}

export interface CheckoutSessionWebhookPayload {
  event: CheckoutSessionEventType;
  data: CheckoutSessionWebhookData;
}

// Pool deposit webhook events
export type PoolDepositRequestEventType = "POOL_DEPOSIT_REQUEST.REJECTED";

/**
 * A pool-account deposit that was rejected during review. A flat, purpose-built
 * shape, not the full transaction: fetch the transaction by `transactionId`
 * when the rest of it is needed.
 */
export interface PoolDepositRejectedWebhookData {
  /** The transaction created by the proof submission. */
  transactionId: string;
  /** The reference supplied on the submission. */
  reference: string;
  /** Omitted when the transaction carries no destination amount. */
  amount?: number;
  /** Omitted when the transaction carries no destination amount. */
  currency?: string;
  /** Free text entered by the reviewer. Show it to an operator; do not branch on it. */
  rejectionReason: string;
  /** `true` when the submission can be corrected and sent again, `false` when the rejection is final. */
  resubmissionRequired: boolean;
}

export interface PoolDepositRequestWebhookPayload {
  event: PoolDepositRequestEventType;
  data: PoolDepositRejectedWebhookData;
}

// Union type for all webhook payloads
export type WebhookPayload =
  | CustomerWebhookPayload
  | PaymentMethodWebhookPayload
  | TransactionWebhookPayload
  | CheckoutSessionWebhookPayload
  | PoolDepositRequestWebhookPayload;

// Webhook signature header
export const WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";

/** Every event Afriex can deliver. */
export type WebhookEventType =
  | CustomerEventType
  | PaymentMethodEventType
  | TransactionEventType
  | CheckoutSessionEventType
  | PoolDepositRequestEventType;

/**
 * The events the sandbox test trigger can fire. `POOL_DEPOSIT_REQUEST.REJECTED`
 * is delivered by the pool-account review flow only; the trigger answers 400
 * for it.
 */
export type TriggerableWebhookEventType = Exclude<
  WebhookEventType,
  PoolDepositRequestEventType
>;

export interface TriggerWebhookRequest {
  /**
   * The webhook event type to trigger
   */
  event: TriggerableWebhookEventType;
  /**
   * The identifier of the entity to send in the webhook payload. Must be a
   * UUID v4 for `CHECKOUT_SESSION.CREATED`; otherwise the 24-character
   * hexadecimal id of the relevant customer, payment method, or transaction.
   * Either `entityId` or the deprecated `resourceId` is required.
   */
  entityId?: string;
  /**
   * @deprecated Use `entityId` instead. Kept as a fallback for backward
   * compatibility — `triggerTestWebhook` still sends it as
   * `entityId`.
   * A deprecation warning is logged when this is used without `entityId`.
   */
  resourceId?: string;
}

/** The outcome of queueing a test webhook. */
export interface TriggerWebhookResult {
  /** True once the test event has been accepted for delivery. */
  queued: boolean;
  /** The event type that was triggered. */
  event: TriggerableWebhookEventType;
  /** The entity the test payload was built from. */
  entityId: string;
  /** The endpoint the test event will be delivered to. */
  deliveryUrl?: string;
}

/** Response envelope for POST /webhooks/trigger. */
export interface TriggerWebhookResponse {
  data: TriggerWebhookResult;
}

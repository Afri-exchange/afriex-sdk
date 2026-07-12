/**
 * Webhook types matching Afriex Business API
 */

// Customer webhook events
export type CustomerEventType =
  | "CUSTOMER.CREATED"
  | "CUSTOMER.UPDATED"
  | "CUSTOMER.DELETED";

export interface CustomerWebhookData {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
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

export type TransactionWebhookStatus =
  | "PENDING"
  | "PROCESSING"
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
  | "DISPUTED"
  | "DISPUTE_RESOLVED"
  | "DISPUTE_WON"
  | "DISPUTE_LOST"
  | "DISPUTE_EVIDENCE_SUBMITTED";

export interface TransactionWebhookData {
  status: TransactionWebhookStatus;
  type: string;
  channel?: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  sourceId?: string;
  destinationId: string;
  customerId: string;
  transactionId: string;
  /** Mirrors meta.reference from the create request. */
  merchantReference?: string;
  meta: {
    narration?: string;
    invoice?: string;
    idempotencyKey?: string;
    reference?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TransactionWebhookPayload {
  event: TransactionEventType;
  data: TransactionWebhookData;
}

// Checkout session webhook events
export type CheckoutSessionEventType = "CHECKOUT_SESSION.CREATED";

export interface CheckoutSessionWebhookData {
  [key: string]: unknown;
}

export interface CheckoutSessionWebhookPayload {
  event: CheckoutSessionEventType;
  data: CheckoutSessionWebhookData;
}

// Union type for all webhook payloads
export type WebhookPayload =
  | CustomerWebhookPayload
  | PaymentMethodWebhookPayload
  | TransactionWebhookPayload
  | CheckoutSessionWebhookPayload;

// Webhook signature header
export const WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";

// Webhook trigger types
export type WebhookEventType =
  | CustomerEventType
  | PaymentMethodEventType
  | TransactionEventType
  | CheckoutSessionEventType;

export interface TriggerWebhookRequest {
  /**
   * The webhook event type to trigger
   */
  event: WebhookEventType;
  /**
   * The resource ID (customerId, paymentMethodId, or transactionId)
   */
  resourceId: string;
}

export interface TriggerWebhookResponse {
  success: boolean;
  message?: string;
}

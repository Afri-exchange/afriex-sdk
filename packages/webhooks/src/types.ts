/**
 * Webhook types matching Afriex Business API
 */

// Customer webhook events
export type CustomerEventType = 'CUSTOMER.CREATED' | 'CUSTOMER.UPDATED' | 'CUSTOMER.DELETED';

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
    | 'PAYMENT_METHOD.CREATED'
    | 'PAYMENT_METHOD.UPDATED'
    | 'PAYMENT_METHOD.DELETED';

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
    meta?: Record<string, unknown>;
}

export interface PaymentMethodWebhookPayload {
    event: PaymentMethodEventType;
    data: PaymentMethodWebhookData;
}

// Transaction webhook events
export type TransactionEventType = 'TRANSACTION.CREATED' | 'TRANSACTION.UPDATED';

export type TransactionWebhookStatus =
    | 'PENDING'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'
    | 'SUCCESS'
    | 'REFUNDED'
    | 'RETRY'
    | 'UNKNOWN'
    | 'REJECTED'
    | 'IN_REVIEW';

export interface TransactionWebhookData {
    status: TransactionWebhookStatus;
    type: string;
    sourceAmount: string;
    sourceCurrency: string;
    destinationAmount: string;
    destinationCurrency: string;
    destinationId: string;
    customerId: string;
    transactionId: string;
    meta: {
        narration?: string;
        invoice?: string;
        idempotencyKey?: string;
        merchantId?: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface TransactionWebhookPayload {
    event: TransactionEventType;
    data: TransactionWebhookData;
}

// Union type for all webhook payloads
export type WebhookPayload =
    | CustomerWebhookPayload
    | PaymentMethodWebhookPayload
    | TransactionWebhookPayload;

// Webhook signature header
export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';

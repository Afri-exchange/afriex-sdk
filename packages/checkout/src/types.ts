/**
 * Checkout types matching Afriex Business API
 */

export interface CheckoutCustomer {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface CheckoutTransactionMeta {
  narration?: string;
  idempotencyKey: string;
  reference: string;
  merchantId?: string;
}

export interface CheckoutTransaction {
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  type: "WITHDRAW" | "DEPOSIT";
  destinationId?: string;
  sourceId?: string;
  meta: CheckoutTransactionMeta;
}

export interface CreateCheckoutSessionRequest {
  customer: CheckoutCustomer;
  transaction: CheckoutTransaction;
  successUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
}

export interface CheckoutSession {
  checkoutId: string;
  checkoutUrl: string;
  expiresAt: string;
}

export interface CreateCheckoutSessionResponse {
  data: CheckoutSession;
}

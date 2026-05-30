/**
 * Checkout types matching Afriex Business API
 */

export interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

export type CheckoutChannel = "VIRTUAL_BANK_ACCOUNT" | "MOBILE_MONEY";

export interface CreateCheckoutSessionRequest {
  amount: number;
  currency: string;
  merchantReference: string;
  redirectUrl: string;
  customer: CheckoutCustomer;
  channels?: CheckoutChannel[];
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  checkoutUrl: string;
}

export interface CreateCheckoutSessionResponse {
  data: CheckoutSession;
}

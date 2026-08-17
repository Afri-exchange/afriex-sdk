/**
 * Checkout types matching Afriex Business API
 */

export interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

export type CheckoutChannel = "CARD" | "VIRTUAL_BANK_ACCOUNT" | "MOBILE_MONEY";

export interface CreateCheckoutSessionRequest {
  amount: number;
  currency: string;
  merchantReference: string;
  redirectUrl: string;
  customer: CheckoutCustomer;
  /**
   * Payment channels to offer on the session. Required, and must be non-empty —
   * the API rejects a request that omits it. Only `VIRTUAL_BANK_ACCOUNT` and
   * `MOBILE_MONEY` are currently accepted.
   */
  channels: CheckoutChannel[];
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  checkoutUrl: string;
  /** The channels enabled on the session, echoed back from the request. */
  channels?: CheckoutChannel[];
}

export interface CreateCheckoutSessionResponse {
  data: CheckoutSession;
}

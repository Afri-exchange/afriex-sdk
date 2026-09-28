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
   * Payment channels you are willing to offer on the session. Required, and
   * must be non-empty — the API rejects a request that omits it.
   *
   * It is a cap, not an exact list: channels the `currency` does not support
   * are dropped, so the same list works on every corridor. `CARD` is collected
   * through hosted checkout only.
   */
  channels: CheckoutChannel[];
  /**
   * Flat key/value data to attach to the session. At most 50 entries, with
   * keys of 1 to 128 characters and values of at most 1024.
   */
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  checkoutUrl: string;
  /**
   * The channels the payer will actually be offered: the requested `channels`,
   * in the order sent, minus any the currency cannot collect on.
   */
  channels?: CheckoutChannel[];
}

export interface CreateCheckoutSessionResponse {
  data: CheckoutSession;
}

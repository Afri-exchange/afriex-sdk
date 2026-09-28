/**
 * Balance types matching Afriex Business API
 */

export interface BalanceResponse {
  data: Record<string, number>;
}

export interface GetBalanceParams {
  /** Currencies to fetch balances for. If omitted, all supported currencies are returned. */
  currencies?: string | string[];
}

export interface TopUpParams {
  /** A positive number representing the amount to credit. */
  amount: number;
  /** Uppercase 3-letter ISO 4217 currency code (e.g. USD, NGN, GBP). */
  currency: string;
}

export type TopUpTransactionType = "WITHDRAW" | "DEPOSIT" | "SWAP";

/**
 * The top-up endpoint returns a transaction, so this is the transaction status
 * set. A sandbox top-up settles at once and reports `SUCCESS`.
 *
 * `COMPLETED` is deprecated: it is not part of the published API and is kept
 * only so existing comparisons keep compiling.
 */
export type TopUpTransactionStatus =
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

export interface TopUpTransaction {
  transactionId: string;
  /** Empty string — a top-up credits the business wallet, not a customer. */
  customerId: string;
  /** Not set on a top-up, which has no source payment method. */
  sourceId?: string;
  /**
   * Documented as an empty string on a business top-up, but omitted entirely by
   * the sandbox, so it is not safe to treat as always present.
   */
  destinationId?: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  type: TopUpTransactionType;
  /** Channel the credit came through. Sandbox top-ups report `ADMIN`. */
  channel?: string;
  status: TopUpTransactionStatus;
  /** The merchant-supplied reference, when the transaction carries one. */
  merchantReference?: string;
  /** Realized source-to-destination rate. */
  rate?: string;
  /** Fee charged, denominated in `sourceCurrency`. Omitted when no fee applied. */
  fee?: string;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TopUpResponse {
  data: TopUpTransaction;
}

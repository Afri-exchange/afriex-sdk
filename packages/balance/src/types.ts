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

export type TopUpTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "IN_REVIEW"
  | "REJECTED"
  | "RETRY"
  | "UNKNOWN";

export interface TopUpTransaction {
  transactionId: string;
  /** Empty string — a top-up credits the business wallet, not a customer. */
  customerId: string;
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
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TopUpResponse {
  data: TopUpTransaction;
}

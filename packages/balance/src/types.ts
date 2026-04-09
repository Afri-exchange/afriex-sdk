/**
 * Balance types matching Afriex Business API
 */

export interface BalanceResponse {
  data: Record<string, number>;
}

export interface GetBalanceParams {
  currencies: string | string[];
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
  customerId: string;
  destinationId: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  type: TopUpTransactionType;
  status: TopUpTransactionStatus;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TopUpResponse {
  data: TopUpTransaction;
}

/**
 * Transaction types matching Afriex Business API
 */

export type TransactionType = "WITHDRAW" | "DEPOSIT" | "SWAP";

export const TransactionStatus = {
  CANCELLED: "CANCELLED",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SCHEDULED: "SCHEDULED",
  REFUNDED: "REFUNDED",
  RETRY: "RETRY",
  UNKNOWN: "UNKNOWN",
  CUSTOMER_ACTION_REQUIRED: "CUSTOMER_ACTION_REQUIRED",
  REJECTED: "REJECTED",
  IN_REVIEW: "IN_REVIEW",
  DISPUTED: "DISPUTED",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  DISPUTE_WON: "DISPUTE_WON",
  DISPUTE_LOST: "DISPUTE_LOST",
  DISPUTE_EVIDENCE_SUBMITTED: "DISPUTE_EVIDENCE_SUBMITTED",
} as const;
export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

/**
 * The `meta` object passed when creating a transaction. `idempotencyKey` and `reference` are required.
 */
export interface TransactionMeta {
  /**
   * Human-readable reason or description for the transaction
   */
  narration?: string;
  /**
   * 	Base64-encoded invoice document to attach to the transaction
   */
  invoice?: string;
  /**
   * Unique key to prevent duplicate transactions. Use a UUID or your own unique identifier.
   */
  idempotencyKey: string;
  /**
   * 	Your internal reference for the transaction (e.g. order ID)
   */
  reference: string;
  /**
   * 	Your merchant or business identifier, used for reconciliation
   */
  merchantId?: string;
}

export interface Transaction {
  transactionId: string;
  customerId: string;
  destinationId: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  type: TransactionType;
  status: TransactionStatus;
  meta?: TransactionMeta;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  customerId: string;
  destinationAmount: number | string;
  destinationCurrency: string;
  sourceCurrency: string;
  destinationId: string;
  meta?: TransactionMeta;
}

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  page: number;
  total: number;
}

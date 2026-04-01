/**
 * Transaction types matching Afriex Business API
 */

export type TransactionType = "WITHDRAWAL" | "DEPOSIT";

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
export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

export interface TransactionMeta {
  narration?: string;
  invoice?: string;
  idempotencyKey?: string;
  merchantId: string;
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

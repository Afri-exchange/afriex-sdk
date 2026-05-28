/**
 * Transaction types matching Afriex Business API
 */

export type TransactionType = "WITHDRAW" | "DEPOSIT" | "SWAP";

/** Default transaction type when not specified */
export const DEFAULT_TRANSACTION_TYPE: TransactionType = "WITHDRAW";

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

/**
 * Common fields shared by all transaction creation variants
 */
interface CreateTransactionBase {
  /** The unique identifier of the customer */
  customerId: string;
  /** The transaction amount in the source currency */
  sourceAmount: `${number}`;
  /** The transaction amount in the destination currency */
  destinationAmount: `${number}`;
  destinationCurrency: string;
  sourceCurrency: string;
  /** Required transaction metadata. Must include idempotencyKey and reference. */
  meta: TransactionMeta;
  destinationId?: string;
  sourceId?: string;
}

/**
 * Withdraw transaction — sends funds to a destination payment method.
 * `type` defaults to `WITHDRAW` if omitted.
 */
interface CreateWithdrawTransaction extends CreateTransactionBase {
  type?: "WITHDRAW";
  /** The ID of the destination payment method to send funds to */
  destinationId: string;
}

/**
 * Deposit transaction — pulls funds from a source payment method.
 */
interface CreateDepositTransaction extends CreateTransactionBase {
  type: "DEPOSIT";
  /** The ID of the source payment method to pull funds from */
  sourceId: string;
}

/**
 * Swap transaction — exchanges between currencies.
 */
interface CreateSwapTransaction extends CreateTransactionBase {
  type: "SWAP";
}

/**
 * Request body for creating a transaction. Use `WITHDRAW` (default) to send funds,
 * `DEPOSIT` to pull funds, or `SWAP` to exchange between currencies.
 */
export type CreateTransactionRequest =
  | CreateWithdrawTransaction
  | CreateDepositTransaction
  | CreateSwapTransaction;

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  page: number;
  total: number;
}

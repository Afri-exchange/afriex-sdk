/**
 * Transaction types matching Afriex Business API
 */

export type TransactionType = "WITHDRAW" | "DEPOSIT" | "SWAP";

/** Default transaction type when not specified */
export const DEFAULT_TRANSACTION_TYPE: TransactionType = "WITHDRAW";

export const TransactionStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  RETRY: "RETRY",
  UNKNOWN: "UNKNOWN",
  SCHEDULED: "SCHEDULED",
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

export type TransactionListType =
  | TransactionType
  | "REVERSAL"
  | "SCHEDULED"
  | "SEND";

export type TransactionChannel =
  | "BANK_ACCOUNT"
  | "MOBILE_MONEY"
  | "CARD"
  | "CRYPTO"
  | "VIRTUAL_BANK_ACCOUNT"
  | "ACH_BANK_ACCOUNT"
  | "INTERAC"
  | "PAYBILL_TILL"
  | "RFP"
  | "UPI"
  | "VIRTUAL_CARD"
  | "SWIFT"
  | "WE_CHAT"
  | "ALIPAY"
  | "WALLET";

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
}

/**
 * Stable `AFX_*` failure code. Safe to switch on; the set grows over time
 * but existing values do not change meaning.
 */
export type TransactionFailureCode =
  | "AFX_REQUEST_FAILED"
  | "AFX_SYSTEM_ERROR"
  | "AFX_SERVICE_UNAVAILABLE"
  | "AFX_INVALID_CURRENCY"
  | "AFX_INVALID_AMOUNT"
  | "AFX_INVALID_RECIPIENT"
  | "AFX_RECIPIENT_NOT_FOUND"
  | "AFX_BENEFICIARY_RESTRICTED"
  | "AFX_INVALID_SENDER"
  | "AFX_INVALID_REQUEST"
  | "AFX_VELOCITY_LIMIT_EXCEEDED"
  | "AFX_AMOUNT_LIMIT_EXCEEDED"
  | "AFX_PAYMENT_FAILED"
  | "AFX_COMPLIANCE_REJECTED"
  | "AFX_PROPOSAL_EXPIRED";

/**
 * Present only when `status` is `FAILED` or `REJECTED`. Carries a stable
 * Afriex-side code and a customer-safe message.
 */
export interface TransactionFailureReason {
  code: TransactionFailureCode;
  message: string;
  retryable: boolean;
}

/**
 * Transaction metadata as echoed back on a `Transaction`. Extends the
 * create-time `TransactionMeta` with server-set state flags.
 */
export interface TransactionMetaResponse extends Partial<TransactionMeta> {
  /**
   * Returned on deposits that may need an extra authorization step. When `true`,
   * call `TransactionService.authorize()` to complete the deposit.
   */
  otpRequired?: boolean;
  failureReason?: TransactionFailureReason;
  [key: string]: unknown;
}

export interface Transaction {
  transactionId: string;
  customerId: string;
  sourceId?: string;
  /** Absent on SWAP transactions, which settle within the wallet and have no destination payment method. */
  destinationId?: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  type: TransactionType;
  channel?: TransactionChannel;
  status: TransactionStatus;
  /** Mirrors meta.reference from the create request. */
  merchantReference?: string;
  /** Realized source-to-destination rate: `1 sourceCurrency = rate destinationCurrency`. */
  rate?: string;
  meta?: TransactionMetaResponse;
  createdAt: string;
  updatedAt: string;
}

/**
 * Common fields shared by all transaction creation variants
 */
interface CreateTransactionBase {
  /** The transaction amount in the source currency */
  sourceAmount: `${number}`;
  destinationCurrency: string;
  sourceCurrency: string;
  /** Required transaction metadata. Must include idempotencyKey and reference. */
  meta: TransactionMeta;
  destinationId?: string;
  sourceId?: string;
  /**
   * Opt in to deriving destinationAmount from sourceAmount even when both amounts
   * are sent. Defaults to false (destination-wins semantics). Set true to have
   * sourceAmount drive the payout via the forward rate.
   */
  shouldPreferSourceAmount?: boolean;
}

interface CreateCustomerTransactionBase extends CreateTransactionBase {
  /** The unique identifier of the customer */
  customerId: string;
  /** The transaction amount in the destination currency */
  destinationAmount: `${number}`;
}

/**
 * Withdraw transaction — sends funds to a destination payment method.
 * `type` defaults to `WITHDRAW` if omitted.
 */
interface CreateWithdrawTransaction extends CreateCustomerTransactionBase {
  type?: "WITHDRAW";
  /** The ID of the destination payment method to send funds to */
  destinationId: string;
}

/**
 * Deposit transaction — pulls funds from a source payment method.
 */
interface CreateDepositTransaction extends CreateCustomerTransactionBase {
  type: "DEPOSIT";
  /** The ID of the source payment method to pull funds from */
  sourceId: string;
}

/**
 * Swap transaction — exchanges between currencies.
 * The API calculates the final destination amount.
 */
interface CreateSwapTransaction extends CreateTransactionBase {
  type: "SWAP";
  customerId?: string;
  destinationAmount?: `${number}`;
}

/**
 * Request body for creating a transaction. Use `WITHDRAW` (default) to send funds,
 * `DEPOSIT` to pull funds, or `SWAP` to exchange between currencies.
 */
export type CreateTransactionRequest =
  | CreateWithdrawTransaction
  | CreateDepositTransaction
  | CreateSwapTransaction;

/**
 * Request body for POST /transaction/{transactionId}/authorize.
 * Today the only supported variant is `OTP`.
 */
export interface AuthorizeTransactionRequest {
  type: "OTP";
  /** The one-time password supplied by the customer. */
  otp: string;
}

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
  transactionId?: string;
  reference?: string;
  status?: TransactionStatus | TransactionStatus[];
  type?: TransactionListType | TransactionListType[];
  channel?: TransactionChannel | TransactionChannel[];
  currency?: string | string[];
  fromDate?: string;
  toDate?: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  page: number;
  total: number;
}

/**
 * Transaction types matching Afriex Business API
 */

export type TransactionType = "WITHDRAW" | "DEPOSIT" | "SWAP";

/** Default transaction type when not specified */
export const DEFAULT_TRANSACTION_TYPE: TransactionType = "WITHDRAW";

export const TransactionStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  /**
   * @deprecated Not part of the published API. The terminal success status is
   * `SUCCESS`, and the list endpoint rejects `COMPLETED` as a filter with 422.
   * Kept only so older stored values still type-check.
   */
  COMPLETED: "COMPLETED",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  RETRY: "RETRY",
  UNKNOWN: "UNKNOWN",
  SCHEDULED: "SCHEDULED",
  CUSTOMER_ACTION_REQUIRED: "CUSTOMER_ACTION_REQUIRED",
  REJECTED: "REJECTED",
  /** Review state: still in flight and waiting on a review, not on you. */
  IN_REVIEW: "IN_REVIEW",
  /**
   * Review state: held pending a request for information. Someone may contact
   * you about the transfer. Treat it as non-terminal, like `IN_REVIEW`.
   */
  RFI_REQUESTED: "RFI_REQUESTED",
  DISPUTED: "DISPUTED",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  DISPUTE_WON: "DISPUTE_WON",
  DISPUTE_LOST: "DISPUTE_LOST",
  DISPUTE_EVIDENCE_SUBMITTED: "DISPUTE_EVIDENCE_SUBMITTED",
} as const;
export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

/**
 * Statuses the list endpoint accepts as a filter. `COMPLETED` is left out: the
 * API answers 422 for it.
 */
export type TransactionListStatus = Exclude<TransactionStatus, "COMPLETED">;

export type TransactionListType =
  | TransactionType
  | "REVERSAL"
  | "SCHEDULED"
  | "SEND";

/**
 * The payment channel of a transaction. `ADMIN` marks an adjustment Afriex made
 * to your wallet (sandbox top-ups report it); `PAYMENT_LINQ` a payment made
 * through a payment link.
 */
export type TransactionChannel =
  | "BANK_ACCOUNT"
  | "MOBILE_MONEY"
  | "CARD"
  | "CRYPTO"
  | "VIRTUAL_BANK_ACCOUNT"
  | "POOL_ACCOUNT"
  | "ACH_BANK_ACCOUNT"
  | "INTERAC"
  | "PAYBILL_TILL"
  | "RFP"
  | "UPI"
  | "VIRTUAL_CARD"
  | "SWIFT"
  | "WE_CHAT"
  | "ALIPAY"
  | "WALLET"
  | "PAYMENT_LINQ"
  | "ADMIN";

/**
 * How a withdrawal is settled. `spot` (the default) processes immediately and
 * debits the Payout wallet. `request` debits the Collection wallet and queues
 * the payout for the next business day in the destination country.
 */
export type TransactionSettlement = "spot" | "request";

/**
 * The `meta` object passed when creating a transaction. `idempotencyKey` and `reference` are required.
 */
export interface TransactionMeta {
  /**
   * Human-readable reason or description for the transaction
   */
  narration?: string;
  /**
   * The invoice's object key, as returned by the media upload endpoint.
   * Required for SWIFT withdrawals. Upload the file first and pass the returned
   * `key` verbatim: the object is checked to exist before the transaction is
   * created.
   */
  invoice?: string;
  /**
   * Unique key to prevent duplicate transactions. Use a UUID or your own unique identifier.
   */
  idempotencyKey: string;
  /**
   * Your internal reference for the transaction (e.g. order ID). Returned on
   * the transaction as `merchantReference`.
   */
  reference: string;
  /**
   * Settlement handling. Omit it, or send `spot`, for an ordinary payout from
   * the Payout wallet. `request` is supported for WITHDRAW only.
   */
  settlement?: TransactionSettlement;
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
  | "AFX_ACCOUNT_CLOSED"
  | "AFX_NAME_MISMATCH"
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
  /** Fee charged for the transaction, denominated in `sourceCurrency`. */
  fee?: string;
  meta?: TransactionMetaResponse;
  createdAt: string;
  updatedAt: string;
}

/**
 * A monetary amount on a request: a number or a numeric string. Responses
 * always return amounts as strings.
 */
export type TransactionAmount = `${number}` | number;

/**
 * The amounts of a transaction. At least one is required; the API derives the
 * other side at the live rate.
 *
 * When both are sent, `destinationAmount` wins unless
 * `shouldPreferSourceAmount` is true.
 */
export type TransactionAmounts =
  | {
      /** The transaction amount in the source currency. */
      sourceAmount: TransactionAmount;
      /** The transaction amount in the destination currency. */
      destinationAmount?: TransactionAmount;
    }
  | {
      /** The transaction amount in the source currency. */
      sourceAmount?: TransactionAmount;
      /** The transaction amount in the destination currency. */
      destinationAmount: TransactionAmount;
    };

/**
 * Common fields shared by all transaction creation variants
 */
interface CreateTransactionBase {
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
  /**
   * The correspondent (intermediary) bank name for a USD payout: a WITHDRAW to
   * USD with `meta.settlement: "request"`. A fallback only; the value stored
   * on the destination payment method takes precedence. Must be sent together
   * with `correspondentBankAccountNumber`.
   */
  correspondentBankName?: string;
  /**
   * The correspondent (intermediary) bank account number. Must be sent
   * together with `correspondentBankName`.
   */
  correspondentBankAccountNumber?: string;
}

/**
 * Withdraw transaction — sends funds to a destination payment method.
 * `type` defaults to `WITHDRAW` if omitted.
 */
export type CreateWithdrawTransaction = CreateTransactionBase &
  TransactionAmounts & {
    type?: "WITHDRAW";
    /** The unique identifier of the customer */
    customerId: string;
    /** The ID of the destination payment method to send funds to */
    destinationId: string;
  };

/**
 * Deposit transaction — pulls funds from a source payment method.
 */
export type CreateDepositTransaction = CreateTransactionBase &
  TransactionAmounts & {
    type: "DEPOSIT";
    /** The unique identifier of the customer */
    customerId: string;
    /** The ID of the source payment method to pull funds from */
    sourceId: string;
  };

/**
 * Swap transaction — exchanges between currencies inside the wallet.
 * The API computes the side you leave out at the live exchange rate.
 */
export type CreateSwapTransaction = CreateTransactionBase &
  TransactionAmounts & {
    type: "SWAP";
    /** Optional. When omitted, the swap runs against the business wallet. */
    customerId?: string;
  };

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
  status?: TransactionListStatus | TransactionListStatus[];
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

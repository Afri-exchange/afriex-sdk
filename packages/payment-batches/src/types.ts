/**
 * The wallet a batch is funded from. Every payout is converted from this
 * currency.
 */
export interface PaymentBatchSource {
  /** The only funding channel is the wallet. Defaults to `WALLET`. */
  channel?: "WALLET";
  /** The 3-letter ISO 4217 code of the wallet to pay from. */
  currencyCode: string;
}

/**
 * Request body for POST /payment-batch and PATCH /payment-batch/{batchId}.
 * An update replaces the batch whole, so it takes both fields too.
 */
export interface PaymentBatchRequest {
  /** A label for the batch. */
  name: string;
  sourcePaymentMethod: PaymentBatchSource;
}

/** The method a batch is funded from, as the API returns it. */
export interface PaymentBatchFundingMethod {
  channel: string;
  currencyCode: string;
  [key: string]: unknown;
}

/** A payment batch, as create, get and update return it. */
export interface PaymentBatch {
  id: string;
  name: string;
  sourcePaymentMethod: PaymentBatchFundingMethod;
  meta?: {
    /** How many recipients the batch holds. */
    memberCount?: number;
  };
}

/** A payment batch as it appears in the list. */
export interface PaymentBatchListItem {
  id: string;
  name: string;
  meta?: {
    flags?: {
      isDeactivated?: boolean;
    };
    /** How many recipients the batch holds. */
    memberCount?: number;
  };
}

/** Pagination for the batch, recipient and session lists. */
export interface PaymentBatchListParams {
  /** Zero-based page number. Defaults to 0. */
  page?: number;
  /** Items per page, 1 to 100. Defaults to 100. */
  limit?: number;
}

export interface PaymentBatchListResponse {
  data: PaymentBatchListItem[];
  page: number;
  total: number;
}

/** The bank or provider of a recipient, as on a payment method. */
export interface PaymentBatchInstitution {
  institutionId?: string;
  institutionName?: string;
  institutionCode?: string;
}

/** What a recipient is paid on each run of the batch. */
export interface PaymentBatchAmount {
  /**
   * The amount, in the recipient's currency. The API reference documents a
   * string; a number is accepted too, and comes back as the number it was
   * sent as.
   */
  value: string | number;
  /** The 3-letter ISO 4217 code of the currency the recipient receives. */
  currencyCode: string;
}

/**
 * The account to pay, in the shape a payment method is created with, plus the
 * amount to pay it in this batch.
 */
export interface PaymentBatchRecipientRequest {
  /** The payout channel, such as `BANK_ACCOUNT` or `MOBILE_MONEY`. */
  channel: string;
  accountName: string;
  accountNumber: string;
  /** ISO 3166-1 alpha-2 country code of the account. */
  countryCode: string;
  /** Required for every channel except `UPI` and `INTERAC`. */
  institution?: PaymentBatchInstitution;
  amount: PaymentBatchAmount;
}

/**
 * Request body for PATCH /payment-batch/{batchId}/recipients/{recipientId}.
 * The recipient is replaced whole: send every field, not only the changed one.
 */
export interface UpdatePaymentBatchRecipientRequest
  extends PaymentBatchRecipientRequest {
  /** Pass the recipient's `paymentMethodId` to update that saved account in place. */
  paymentMethodId?: string;
}

/**
 * The account saved for a recipient, as add and update return it.
 *
 * `id` is the saved account's id: the `paymentMethodId` of the recipient in
 * the list, not its `recipientId`.
 */
export interface SavedPaymentBatchRecipient {
  id: string;
  channel: string;
  countryCode: string;
  accountName?: string;
  accountNumber?: string;
  institution?: PaymentBatchInstitution;
  amount?: PaymentBatchAmount;
}

/** A recipient as the recipient list returns it. */
export interface PaymentBatchRecipient {
  /** The saved account the recipient is paid to. */
  paymentMethodId: string;
  /** The recipient's id in this batch, used to update or remove it. */
  recipientId: string;
  channel: string;
  countryCode: string;
  accountName: string;
  accountNumber?: string;
  institution?: PaymentBatchInstitution;
  amount?: PaymentBatchAmount;
}

export interface PaymentBatchRecipientListResponse {
  data: PaymentBatchRecipient[];
  page: number;
  total: number;
}

/**
 * Per-item outcomes. Adding recipients in bulk keys both maps by account
 * number; a withdrawal keys them by `recipientId`.
 */
export interface PaymentBatchOutcomes {
  /** A message for each item that succeeded. */
  successes: Record<string, string>;
  /** The reason each failed item failed, usually an error code. */
  errors: Record<string, string>;
}

export interface WithdrawPaymentBatchParams {
  /**
   * The id of an earlier run of this batch. Only the recipients that failed
   * in that run are paid. Without it, every recipient is paid again.
   */
  sessionId?: string;
}

/** What happened to one recipient in a run. */
export interface PaymentBatchSessionResult {
  status: string;
  errorMessage?: string;
  [key: string]: unknown;
}

/** One run of a batch: a withdrawal attempt and its results. */
export interface PaymentBatchSession {
  id: string;
  batchId: string;
  createdAt: string;
  meta?: {
    /** The result for each recipient, keyed by `recipientId`. */
    results?: Record<string, PaymentBatchSessionResult>;
  };
}

export interface PaymentBatchSessionListResponse {
  data: PaymentBatchSession[];
  page: number;
  total: number;
}

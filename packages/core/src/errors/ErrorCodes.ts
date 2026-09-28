/**
 * `code` values returned by the Afriex Business API's `ErrorResponse.code` field.
 * Kept in sync with the values documented across the OpenAPI spec's error examples.
 *
 * The set is not closed: the API can return codes that are not listed here, so
 * compare `ApiError.errorCode` against these constants rather than assuming
 * every response carries one of them.
 */
export const AfriexErrorCode = {
  // Authentication
  /** 401. Also returned when the key lacks the permission the endpoint needs. */
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  /**
   * 403. Set by the SDK when an endpoint is not available in the current
   * environment: those responses carry `{ message }` and no `code` of their own.
   */
  FORBIDDEN: "FORBIDDEN",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  /** 400. Observed in the sandbox, e.g. for an unsupported `x-api-version`. */
  BAD_REQUEST_ERROR: "BAD_REQUEST_ERROR",
  INVALID_USER_DATA: "INVALID_USER_DATA",
  INVALID_BUSINESS_CUSTOMER_REQUEST: "INVALID_BUSINESS_CUSTOMER_REQUEST",
  INVALID_BUSINESS_CUSTOMER_ID: "INVALID_BUSINESS_CUSTOMER_ID",
  INVALID_BUSINESS_TRANSACTION_REQUEST: "INVALID_BUSINESS_TRANSACTION_REQUEST",
  INVALID_BUSINESS_TRANSACTION_ID: "INVALID_BUSINESS_TRANSACTION_ID",
  /** 400. Observed in the sandbox on POST /payment-method. */
  INVALID_BUSINESS_PAYMENT_METHOD_REQUEST:
    "INVALID_BUSINESS_PAYMENT_METHOD_REQUEST",
  INVALID_BUSINESS_PAYMENT_METHOD_ID: "INVALID_BUSINESS_PAYMENT_METHOD_ID",
  INVALID_BUSINESS_POOL_ACCOUNT_REQUEST: "INVALID_BUSINESS_POOL_ACCOUNT_REQUEST",
  INVALID_KYC_DOCUMENT_TYPE: "INVALID_KYC_DOCUMENT_TYPE",
  /** 400. The channel is not supported by the endpoint, e.g. institution lookup. */
  INVALID_TRANSACTION_CHANNEL: "INVALID_TRANSACTION_CHANNEL",
  /** The one-time password submitted to authorize a transaction was wrong. */
  OTP_INCORRECT: "OTP_INCORRECT",
  /** 400. Observed in the sandbox when the amount is below the corridor minimum. */
  TRANSACTION_AMOUNT_TOO_SMALL: "TRANSACTION_AMOUNT_TOO_SMALL",

  // Conflicts
  /**
   * 409. A transaction with the same idempotency key or reference, or a
   * checkout session with the same merchantReference, already exists. The
   * original is not replayed: look it up instead of retrying.
   */
  DUPLICATE_REQUEST: "DUPLICATE_REQUEST",
  /** 409. `details.data.customerId` carries the existing customer's id. */
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  /** 409. `details.data.customerId` carries the existing customer's id. */
  PHONE_NUMBER_ALREADY_EXISTS: "PHONE_NUMBER_ALREADY_EXISTS",

  // Not found
  BUSINESS_CUSTOMER_NOT_FOUND: "BUSINESS_CUSTOMER_NOT_FOUND",
  BUSINESS_TRANSACTION_NOT_FOUND: "BUSINESS_TRANSACTION_NOT_FOUND",
  BUSINESS_PAYMENT_METHOD_NOT_FOUND: "BUSINESS_PAYMENT_METHOD_NOT_FOUND",
  BUSINESS_NOT_FOUND: "BUSINESS_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  PAYMENT_METHOD_NOT_FOUND: "PAYMENT_METHOD_NOT_FOUND",
  TRANSACTION_PROCESSOR_NOT_FOUND: "TRANSACTION_PROCESSOR_NOT_FOUND",
  /** 404. Observed in the sandbox when no processor serves the channel and country. */
  PROCESSOR_NOT_FOUND: "PROCESSOR_NOT_FOUND",

  // Business logic / limits
  VIRTUAL_ACCOUNT_LIMIT_REACHED: "VIRTUAL_ACCOUNT_LIMIT_REACHED",
  /** 403. A virtual account for a customer can only be NGN. */
  UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY: "UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY",
  /** 403. The currency needs a compliance-approved application first. */
  VIRTUAL_ACCOUNT_PENDING_COMPLIANCE_REVIEW:
    "VIRTUAL_ACCOUNT_PENDING_COMPLIANCE_REVIEW",
  /** 429. The code the API sends when a rate limit is hit. */
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  /**
   * @deprecated The API sends `RATE_LIMIT_ERROR`. Kept so existing comparisons
   * keep compiling; it never matches a response.
   */
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Server errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  /**
   * 503. An upstream processor failed or timed out, or the API is momentarily
   * offline. Retry with backoff and honour `Retry-After`.
   */
  EXTERNAL_REQUEST_ERROR: "EXTERNAL_REQUEST_ERROR",

  // Unknown (client-side fallback; not returned by the API)
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;
export type AfriexErrorCode =
  (typeof AfriexErrorCode)[keyof typeof AfriexErrorCode];

export const ERROR_CODE_MESSAGES: Record<AfriexErrorCode, string> = {
  [AfriexErrorCode.AUTHENTICATION_ERROR]: "Authentication failed, or the API key lacks the permission this endpoint needs",
  [AfriexErrorCode.FORBIDDEN]: "The endpoint is not available in this environment",
  [AfriexErrorCode.VALIDATION_ERROR]: "Request failed schema validation",
  [AfriexErrorCode.BAD_REQUEST_ERROR]: "The request could not be processed",
  [AfriexErrorCode.INVALID_USER_DATA]: "Invalid user data",
  [AfriexErrorCode.INVALID_BUSINESS_CUSTOMER_REQUEST]: "Invalid business customer request",
  [AfriexErrorCode.INVALID_BUSINESS_CUSTOMER_ID]: "Invalid business customer id",
  [AfriexErrorCode.INVALID_BUSINESS_TRANSACTION_REQUEST]: "Invalid business transaction request",
  [AfriexErrorCode.INVALID_BUSINESS_TRANSACTION_ID]: "Invalid business transaction id",
  [AfriexErrorCode.INVALID_BUSINESS_PAYMENT_METHOD_REQUEST]: "Invalid business payment method request",
  [AfriexErrorCode.INVALID_BUSINESS_PAYMENT_METHOD_ID]: "Invalid business payment method id",
  [AfriexErrorCode.INVALID_BUSINESS_POOL_ACCOUNT_REQUEST]: "Invalid business pool account request",
  [AfriexErrorCode.INVALID_KYC_DOCUMENT_TYPE]: "Invalid KYC document type or value",
  [AfriexErrorCode.INVALID_TRANSACTION_CHANNEL]: "The channel is not supported by this endpoint",
  [AfriexErrorCode.OTP_INCORRECT]: "The one-time password is incorrect",
  [AfriexErrorCode.TRANSACTION_AMOUNT_TOO_SMALL]: "The transaction amount is below the minimum",
  [AfriexErrorCode.DUPLICATE_REQUEST]: "A request with the same idempotency key or reference already exists",
  [AfriexErrorCode.EMAIL_ALREADY_EXISTS]: "A customer with this email already exists",
  [AfriexErrorCode.PHONE_NUMBER_ALREADY_EXISTS]: "A customer with this phone number already exists",
  [AfriexErrorCode.BUSINESS_CUSTOMER_NOT_FOUND]: "Business customer not found",
  [AfriexErrorCode.BUSINESS_TRANSACTION_NOT_FOUND]: "Business transaction not found",
  [AfriexErrorCode.BUSINESS_PAYMENT_METHOD_NOT_FOUND]: "Business payment method not found",
  [AfriexErrorCode.BUSINESS_NOT_FOUND]: "Business not found",
  [AfriexErrorCode.USER_NOT_FOUND]: "User not found",
  [AfriexErrorCode.PAYMENT_METHOD_NOT_FOUND]: "Payment method not found",
  [AfriexErrorCode.TRANSACTION_PROCESSOR_NOT_FOUND]: "No transaction processor available for this request",
  [AfriexErrorCode.PROCESSOR_NOT_FOUND]: "No processor available for this channel and country",
  [AfriexErrorCode.VIRTUAL_ACCOUNT_LIMIT_REACHED]: "Virtual account limit reached for this customer and currency",
  [AfriexErrorCode.UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY]: "A virtual account for a customer can only be created in NGN",
  [AfriexErrorCode.VIRTUAL_ACCOUNT_PENDING_COMPLIANCE_REVIEW]: "Virtual accounts in this currency are pending compliance review",
  [AfriexErrorCode.RATE_LIMIT_ERROR]: "Too many requests, please try again later",
  [AfriexErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests, please try again later",
  [AfriexErrorCode.INTERNAL_SERVER_ERROR]: "It's not you, it's us, please reach out to support",
  [AfriexErrorCode.EXTERNAL_REQUEST_ERROR]: "An upstream service is temporarily unavailable, please retry",
  [AfriexErrorCode.UNKNOWN_ERROR]: "Unknown error",
};

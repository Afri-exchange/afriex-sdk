/**
 * `code` values returned by the Afriex Business API's `ErrorResponse.code` field.
 * Kept in sync with the values documented across the OpenAPI spec's error examples.
 */
export const AfriexErrorCode = {
  // Authentication
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  FORBIDDEN: "FORBIDDEN",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_USER_DATA: "INVALID_USER_DATA",
  INVALID_BUSINESS_CUSTOMER_REQUEST: "INVALID_BUSINESS_CUSTOMER_REQUEST",
  INVALID_BUSINESS_TRANSACTION_REQUEST: "INVALID_BUSINESS_TRANSACTION_REQUEST",
  INVALID_BUSINESS_POOL_ACCOUNT_REQUEST: "INVALID_BUSINESS_POOL_ACCOUNT_REQUEST",
  INVALID_KYC_DOCUMENT_TYPE: "INVALID_KYC_DOCUMENT_TYPE",

  // Not found
  BUSINESS_CUSTOMER_NOT_FOUND: "BUSINESS_CUSTOMER_NOT_FOUND",
  BUSINESS_TRANSACTION_NOT_FOUND: "BUSINESS_TRANSACTION_NOT_FOUND",
  BUSINESS_PAYMENT_METHOD_NOT_FOUND: "BUSINESS_PAYMENT_METHOD_NOT_FOUND",
  BUSINESS_NOT_FOUND: "BUSINESS_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  PAYMENT_METHOD_NOT_FOUND: "PAYMENT_METHOD_NOT_FOUND",
  TRANSACTION_PROCESSOR_NOT_FOUND: "TRANSACTION_PROCESSOR_NOT_FOUND",

  // Business logic / limits
  VIRTUAL_ACCOUNT_LIMIT_REACHED: "VIRTUAL_ACCOUNT_LIMIT_REACHED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Server errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",

  // Unknown (client-side fallback; not returned by the API)
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;
export type AfriexErrorCode =
  (typeof AfriexErrorCode)[keyof typeof AfriexErrorCode];

export const ERROR_CODE_MESSAGES: Record<AfriexErrorCode, string> = {
  [AfriexErrorCode.AUTHENTICATION_ERROR]: "Authentication failed or API key is missing/invalid",
  [AfriexErrorCode.FORBIDDEN]: "The API key lacks permission for this request, or the endpoint is unavailable in this environment",
  [AfriexErrorCode.VALIDATION_ERROR]: "Request failed schema validation",
  [AfriexErrorCode.INVALID_USER_DATA]: "Invalid user data",
  [AfriexErrorCode.INVALID_BUSINESS_CUSTOMER_REQUEST]: "Invalid business customer request",
  [AfriexErrorCode.INVALID_BUSINESS_TRANSACTION_REQUEST]: "Invalid business transaction request",
  [AfriexErrorCode.INVALID_BUSINESS_POOL_ACCOUNT_REQUEST]: "Invalid business pool account request",
  [AfriexErrorCode.INVALID_KYC_DOCUMENT_TYPE]: "Invalid KYC document type or value",
  [AfriexErrorCode.BUSINESS_CUSTOMER_NOT_FOUND]: "Business customer not found",
  [AfriexErrorCode.BUSINESS_TRANSACTION_NOT_FOUND]: "Business transaction not found",
  [AfriexErrorCode.BUSINESS_PAYMENT_METHOD_NOT_FOUND]: "Business payment method not found",
  [AfriexErrorCode.BUSINESS_NOT_FOUND]: "Business not found",
  [AfriexErrorCode.USER_NOT_FOUND]: "User not found",
  [AfriexErrorCode.PAYMENT_METHOD_NOT_FOUND]: "Payment method not found",
  [AfriexErrorCode.TRANSACTION_PROCESSOR_NOT_FOUND]: "No transaction processor available for this request",
  [AfriexErrorCode.VIRTUAL_ACCOUNT_LIMIT_REACHED]: "Virtual account limit reached for this customer and currency",
  [AfriexErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests, please try again later",
  [AfriexErrorCode.INTERNAL_SERVER_ERROR]: "It's not you, it's us, please reach out to support",
  [AfriexErrorCode.UNKNOWN_ERROR]: "Unknown error",
};

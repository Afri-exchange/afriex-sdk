export const AfriexErrorCode = {
  // Authentication errors
  INVALID_API_KEY: "INVALID_API_KEY",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Validation errors
  INVALID_REQUEST: "INVALID_REQUEST",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FIELD_FORMAT: "INVALID_FIELD_FORMAT",

  // Business logic errors
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  TRANSFER_LIMIT_EXCEEDED: "TRANSFER_LIMIT_EXCEEDED",
  INVALID_RECIPIENT: "INVALID_RECIPIENT",
  UNSUPPORTED_CURRENCY: "UNSUPPORTED_CURRENCY",
  UNSUPPORTED_COUNTRY: "UNSUPPORTED_COUNTRY",

  // Transaction errors
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  TRANSACTION_PENDING: "TRANSACTION_PENDING",
  TRANSACTION_DECLINED: "TRANSACTION_DECLINED",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",

  // Server errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Unknown
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;
export type AfriexErrorCode =
  (typeof AfriexErrorCode)[keyof typeof AfriexErrorCode];

export const ERROR_CODE_MESSAGES: Record<AfriexErrorCode, string> = {
  [AfriexErrorCode.INVALID_API_KEY]: "Invalid API key provided",
  [AfriexErrorCode.UNAUTHORIZED]: "Authentication required",
  [AfriexErrorCode.FORBIDDEN]: "Access forbidden",
  [AfriexErrorCode.INVALID_REQUEST]: "Invalid request",
  [AfriexErrorCode.MISSING_REQUIRED_FIELD]: "Missing required field",
  [AfriexErrorCode.INVALID_FIELD_FORMAT]: "Invalid field format",
  [AfriexErrorCode.INSUFFICIENT_BALANCE]: "Insufficient balance",
  [AfriexErrorCode.TRANSFER_LIMIT_EXCEEDED]: "Transfer limit exceeded",
  [AfriexErrorCode.INVALID_RECIPIENT]: "Invalid recipient",
  [AfriexErrorCode.UNSUPPORTED_CURRENCY]: "Unsupported currency",
  [AfriexErrorCode.UNSUPPORTED_COUNTRY]: "Unsupported country",
  [AfriexErrorCode.TRANSACTION_FAILED]: "Transaction failed",
  [AfriexErrorCode.TRANSACTION_PENDING]: "Transaction pending",
  [AfriexErrorCode.TRANSACTION_DECLINED]: "Transaction declined",
  [AfriexErrorCode.NETWORK_ERROR]: "Network error",
  [AfriexErrorCode.TIMEOUT]: "Request timeout",
  [AfriexErrorCode.INTERNAL_SERVER_ERROR]: "Internal server error",
  [AfriexErrorCode.SERVICE_UNAVAILABLE]: "Service unavailable",
  [AfriexErrorCode.RATE_LIMIT_EXCEEDED]: "Rate limit exceeded",
  [AfriexErrorCode.UNKNOWN_ERROR]: "Unknown error",
};

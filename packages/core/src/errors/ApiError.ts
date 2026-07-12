import { AfriexError } from "./AfriexError.js";

/**
 * Caller-safe context attached to an API error. `friendlyMessage` is
 * safe to display to end users; `errorMessage` is the technical detail.
 */
export interface ApiErrorDetails {
  errorMessage?: string;
  friendlyMessage?: string;
  data?: {
    customerId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Shape of the Afriex Business API error body: `{ code, error, details }`,
 * where `error` is a human-readable string (not an object).
 */
export interface ApiErrorResponse {
  code?: string;
  error?: string;
  details?: ApiErrorDetails;
}

export class ApiError extends AfriexError {
  public readonly statusCode: number;
  public readonly errorCode?: string;
  public readonly details?: ApiErrorDetails;
  public readonly response: ApiErrorResponse;

  constructor(response: ApiErrorResponse, statusCode: number) {
    const errorMessage =
      response.details?.friendlyMessage ||
      response.details?.errorMessage ||
      response.error ||
      "An API error occurred";

    super(errorMessage);

    this.statusCode = statusCode;
    this.errorCode = response.code;
    this.details = response.details;
    this.response = response;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      response: this.response,
    };
  }
}

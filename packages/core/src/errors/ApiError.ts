import { AfriexError } from "./AfriexError.js";
import { AfriexErrorCode } from "./ErrorCodes.js";

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
 *
 * One family of responses does not follow it: an endpoint that is not
 * available in the current environment (a sandbox-only endpoint called in
 * production, for example) answers 403 with `{ message: "Not allowed" }` and
 * no `code`.
 */
export interface ApiErrorResponse {
  code?: string;
  error?: string;
  details?: ApiErrorDetails;
  /** Present on the 403 an environment-restricted endpoint returns. */
  message?: string;
}

export class ApiError extends AfriexError {
  public readonly statusCode: number;
  /**
   * The API's machine-readable `code`. A 403 that carries no code of its own is
   * reported as `AfriexErrorCode.FORBIDDEN`, so an environment restriction can
   * be told apart from a rejected key, which answers 401.
   */
  public readonly errorCode?: string;
  public readonly details?: ApiErrorDetails;
  public readonly response: ApiErrorResponse;

  constructor(response: ApiErrorResponse, statusCode: number) {
    const errorMessage =
      response.details?.friendlyMessage ||
      response.details?.errorMessage ||
      response.error ||
      response.message ||
      "An API error occurred";

    super(errorMessage);

    this.statusCode = statusCode;
    this.errorCode =
      response.code ??
      (statusCode === 403 ? AfriexErrorCode.FORBIDDEN : undefined);
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

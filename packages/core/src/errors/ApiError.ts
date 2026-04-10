import { AfriexError } from "./AfriexError.js";

export interface ApiErrorResponse {
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
  code?: string;
  details?: unknown;
}

export class ApiError extends AfriexError {
  public readonly statusCode: number;
  public readonly errorCode?: string;
  public readonly details?: unknown;
  public readonly response: ApiErrorResponse;

  constructor(response: ApiErrorResponse, statusCode: number) {
    const errorMessage =
      response.error?.message || response.message || "An API error occurred";

    super(errorMessage);

    this.statusCode = statusCode;
    this.errorCode = response.error?.code || response.code;
    this.details = response.error?.details || response.details;
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

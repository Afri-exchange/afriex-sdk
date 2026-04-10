import { ApiError, ApiErrorResponse } from "./ApiError.js";

export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(response: ApiErrorResponse, retryAfter?: string) {
    super(response, 429);
    this.retryAfter = retryAfter ? parseInt(retryAfter, 10) : undefined;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

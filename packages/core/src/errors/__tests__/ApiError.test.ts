import { describe, it, expect } from "vitest";
import { ApiError } from "../ApiError.js";
import { RateLimitError } from "../RateLimitError.js";
import { AfriexErrorCode } from "../ErrorCodes.js";

describe("ApiError", () => {
  it("prefers details.friendlyMessage when present", () => {
    const error = new ApiError(
      {
        code: "INVALID_BUSINESS_CUSTOMER_REQUEST",
        error: "Invalid business customer request",
        details: {
          errorMessage: "Invalid business customer request",
          friendlyMessage: "No customer phone provided",
        },
      },
      400
    );

    expect(error.message).toBe("No customer phone provided");
    expect(error.errorCode).toBe("INVALID_BUSINESS_CUSTOMER_REQUEST");
    expect(error.statusCode).toBe(400);
    expect(error.details?.friendlyMessage).toBe("No customer phone provided");
  });

  it("falls back to details.errorMessage when friendlyMessage is absent", () => {
    const error = new ApiError(
      {
        code: "VALIDATION_ERROR",
        error: "Failed to parse request",
        details: {
          errorMessage: "Failed to parse request. Issues: 'page' must be a number",
        },
      },
      400
    );

    expect(error.message).toBe(
      "Failed to parse request. Issues: 'page' must be a number"
    );
  });

  it("falls back to the top-level `error` string when details are absent", () => {
    const error = new ApiError(
      {
        code: "AUTHENTICATION_ERROR",
        error: "Authorization header is missing",
      },
      401
    );

    expect(error.message).toBe("Authorization header is missing");
    expect(error.errorCode).toBe("AUTHENTICATION_ERROR");
  });

  it("falls back to a generic message when the body carries nothing usable", () => {
    const error = new ApiError({}, 500);

    expect(error.message).toBe("An API error occurred");
    expect(error.errorCode).toBeUndefined();
  });

  it("surfaces the existing customerId on a create conflict via details.data", () => {
    const error = new ApiError(
      {
        code: "INVALID_BUSINESS_CUSTOMER_REQUEST",
        error: "Invalid business customer request",
        details: {
          errorMessage: "EMAIL_ALREADY_EXISTS",
          friendlyMessage: "A customer with this email already exists",
          data: { customerId: "existing-cust-123" },
        },
      },
      400
    );

    expect(error.details?.data?.customerId).toBe("existing-cust-123");
  });

  it("recognizes real API error codes from AfriexErrorCode", () => {
    const error = new ApiError(
      { code: AfriexErrorCode.BUSINESS_CUSTOMER_NOT_FOUND, error: "Business customer not found" },
      404
    );

    expect(error.errorCode).toBe(AfriexErrorCode.BUSINESS_CUSTOMER_NOT_FOUND);
  });

  it("serializes to JSON with statusCode, errorCode, and details", () => {
    const error = new ApiError(
      {
        code: "BUSINESS_NOT_FOUND",
        error: "Business not found",
        details: { errorMessage: "Business not found", friendlyMessage: "" },
      },
      404
    );

    const json = error.toJSON();
    expect(json.statusCode).toBe(404);
    expect(json.errorCode).toBe("BUSINESS_NOT_FOUND");
    expect(json.details).toEqual({
      errorMessage: "Business not found",
      friendlyMessage: "",
    });
  });
});

describe("RateLimitError", () => {
  it("is an ApiError fixed to statusCode 429 with the correct message", () => {
    const error = new RateLimitError(
      {
        code: "RATE_LIMIT_EXCEEDED",
        error: "Too many requests, please try again later",
      },
      "60"
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe("Too many requests, please try again later");
    expect(error.retryAfter).toBe(60);
  });

  it("leaves retryAfter undefined when no header is provided", () => {
    const error = new RateLimitError({ code: "RATE_LIMIT_EXCEEDED", error: "Too many requests" });

    expect(error.retryAfter).toBeUndefined();
  });
});

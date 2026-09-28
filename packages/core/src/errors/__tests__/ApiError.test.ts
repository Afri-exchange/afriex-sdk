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

  it("reads the message of an environment-restricted 403 and reports FORBIDDEN", () => {
    // Sandbox-only endpoints answer production calls with this body, which
    // carries neither `code` nor `error`.
    const error = new ApiError({ message: "Not allowed" }, 403);

    expect(error.message).toBe("Not allowed");
    expect(error.errorCode).toBe(AfriexErrorCode.FORBIDDEN);
    expect(error.statusCode).toBe(403);
  });

  it("keeps the API's own code on a 403 that carries one", () => {
    const error = new ApiError(
      {
        code: "UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY",
        error: "Unsupported virtual account currency",
      },
      403
    );

    expect(error.errorCode).toBe(
      AfriexErrorCode.UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY
    );
  });

  it("surfaces the existing customerId on a create conflict via details.data", () => {
    // The shape the API returns on a duplicate: 409, with the conflict named by
    // `code` and an empty friendlyMessage.
    const error = new ApiError(
      {
        code: "EMAIL_ALREADY_EXISTS",
        error: "Email already exists",
        details: {
          errorMessage: "Email already exists",
          friendlyMessage: "",
          data: { customerId: "existing-cust-123" },
        },
      },
      409
    );

    expect(error.errorCode).toBe(AfriexErrorCode.EMAIL_ALREADY_EXISTS);
    expect(error.message).toBe("Email already exists");
    expect(error.details?.data?.customerId).toBe("existing-cust-123");
  });

  it("names every code the API reference documents", () => {
    const documented = [
      "AUTHENTICATION_ERROR",
      "BUSINESS_CUSTOMER_NOT_FOUND",
      "BUSINESS_NOT_FOUND",
      "BUSINESS_PAYMENT_METHOD_NOT_FOUND",
      "BUSINESS_TRANSACTION_NOT_FOUND",
      "DUPLICATE_REQUEST",
      "EMAIL_ALREADY_EXISTS",
      "EXTERNAL_REQUEST_ERROR",
      "INTERNAL_SERVER_ERROR",
      "INVALID_BUSINESS_CUSTOMER_ID",
      "INVALID_BUSINESS_CUSTOMER_REQUEST",
      "INVALID_BUSINESS_PAYMENT_METHOD_ID",
      "INVALID_BUSINESS_POOL_ACCOUNT_REQUEST",
      "INVALID_BUSINESS_TRANSACTION_ID",
      "INVALID_BUSINESS_TRANSACTION_REQUEST",
      "INVALID_KYC_DOCUMENT_TYPE",
      "INVALID_TRANSACTION_CHANNEL",
      "INVALID_USER_DATA",
      "OTP_INCORRECT",
      "PAYMENT_METHOD_NOT_FOUND",
      "PHONE_NUMBER_ALREADY_EXISTS",
      "RATE_LIMIT_ERROR",
      "TRANSACTION_PROCESSOR_NOT_FOUND",
      "UNSUPPORTED_VIRTUAL_ACCOUNT_CURRENCY",
      "USER_NOT_FOUND",
      "VALIDATION_ERROR",
      "VIRTUAL_ACCOUNT_LIMIT_REACHED",
      "VIRTUAL_ACCOUNT_PENDING_COMPLIANCE_REVIEW",
    ];
    const known = Object.values(AfriexErrorCode) as string[];

    expect(documented.filter((code) => !known.includes(code))).toEqual([]);
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
        code: "RATE_LIMIT_ERROR",
        error: "Too many requests, please try again later",
      },
      "60"
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe("Too many requests, please try again later");
    expect(error.retryAfter).toBe(60);
    expect(error.errorCode).toBe(AfriexErrorCode.RATE_LIMIT_ERROR);
  });

  it("leaves retryAfter undefined when no header is provided", () => {
    const error = new RateLimitError({ code: "RATE_LIMIT_ERROR", error: "Too many requests" });

    expect(error.retryAfter).toBeUndefined();
  });
});

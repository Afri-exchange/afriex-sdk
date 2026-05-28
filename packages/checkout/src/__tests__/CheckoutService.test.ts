import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { CheckoutService } from "../CheckoutService.js";
import { HttpClient } from "@afriex/core";
import { CreateCheckoutSessionRequest } from "../types.js";

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
} as unknown as HttpClient;

describe("CheckoutService", () => {
  let checkoutService: CheckoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    checkoutService = new CheckoutService(mockHttpClient);
  });

  describe("createSession", () => {
    const validRequest: CreateCheckoutSessionRequest = {
      customer: {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        countryCode: "US",
      },
      transaction: {
        sourceAmount: "100.00",
        sourceCurrency: "USD",
        destinationAmount: "100.00",
        destinationCurrency: "NGN",
        type: "WITHDRAW",
        destinationId: "pm_123",
        meta: {
          idempotencyKey: "unique-key",
          reference: "order-123",
        },
      },
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    };

    it("should create a checkout session successfully", async () => {
      const mockSession = {
        checkoutId: "checkout_123",
        checkoutUrl: "https://checkout.afriex.com/session_123",
        expiresAt: "2024-12-31T23:59:59Z",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockSession,
      });

      const result = await checkoutService.createSession(validRequest);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/checkout-session",
        validRequest
      );
      expect(result).toEqual(mockSession);
    });

    it("should throw validation error when customer fields are missing", async () => {
      const invalidRequest = {
        ...validRequest,
        customer: { ...validRequest.customer, email: "" },
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when transaction fields are missing", async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: { ...validRequest.transaction, sourceAmount: "" },
      };

      await expect(
        checkoutService.createSession(invalidRequest as any)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when URLs are missing", async () => {
      const invalidRequest = {
        ...validRequest,
        successUrl: "",
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error for WITHDRAW without destinationId", async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: {
          ...validRequest.transaction,
          type: "WITHDRAW" as const,
          destinationId: undefined,
        },
      };

      await expect(
        checkoutService.createSession(invalidRequest as any)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error for DEPOSIT without sourceId", async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: {
          ...validRequest.transaction,
          type: "DEPOSIT" as const,
          destinationId: undefined,
          sourceId: undefined,
        },
      };

      await expect(
        checkoutService.createSession(invalidRequest as any)
      ).rejects.toThrow("Validation failed");
    });

    it("should include webhookUrl when provided", async () => {
      const requestWithWebhook = {
        ...validRequest,
        webhookUrl: "https://example.com/webhook",
      };

      const mockSession = {
        checkoutId: "checkout_123",
        checkoutUrl: "https://checkout.afriex.com/session_123",
        expiresAt: "2024-12-31T23:59:59Z",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockSession,
      });

      await checkoutService.createSession(requestWithWebhook);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/checkout-session",
        requestWithWebhook
      );
    });

    it("should throw validation error when meta is missing", async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: {
          ...validRequest.transaction,
          meta: undefined,
        },
      };

      await expect(
        checkoutService.createSession(invalidRequest as any)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when meta.idempotencyKey is missing", async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: {
          ...validRequest.transaction,
          meta: {
            idempotencyKey: "",
            reference: "ref-123",
          },
        },
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when meta.reference is missing", async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: {
          ...validRequest.transaction,
          meta: {
            idempotencyKey: "key-123",
            reference: "",
          },
        },
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });
  });
});

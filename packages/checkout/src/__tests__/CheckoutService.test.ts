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
      amount: 500000,
      currency: "NGN",
      merchantReference: "order-123",
      redirectUrl: "https://example.com/checkout/return",
      customer: {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        countryCode: "NG",
      },
      channels: ["VIRTUAL_BANK_ACCOUNT"],
      metadata: {
        orderId: "ord_123",
      },
    };

    it("should create a checkout session successfully", async () => {
      const mockSession = {
        checkoutUrl: "https://checkout.afriex.com/pay/session_123",
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

    it("should throw validation error when amount is below the minimum", async () => {
      const invalidRequest = {
        ...validRequest,
        amount: 99,
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when redirectUrl is not HTTPS", async () => {
      const invalidRequest = {
        ...validRequest,
        redirectUrl: "http://example.com/checkout/return",
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when merchantReference is missing", async () => {
      const invalidRequest = {
        ...validRequest,
        merchantReference: "",
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should allow optional metadata and channels to be omitted", async () => {
      const invalidRequest = {
        ...validRequest,
        channels: undefined,
        metadata: undefined,
      };

      const mockSession = {
        checkoutUrl: "https://checkout.afriex.com/pay/session_123",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockSession,
      });

      await expect(
        checkoutService.createSession(invalidRequest)
      ).resolves.toEqual(mockSession);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/checkout-session",
        invalidRequest
      );
    });

    it("should throw validation error when channels contain an unsupported value", async () => {
      const invalidRequest = {
        ...validRequest,
        channels: ["CARD"] as any,
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when metadata values are not strings", async () => {
      const invalidRequest = {
        ...validRequest,
        metadata: {
          orderId: 123,
        } as any,
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when customer country code is not ISO alpha-2", async () => {
      const invalidRequest = {
        ...validRequest,
        customer: {
          ...validRequest.customer,
          countryCode: "NGA",
        },
      };

      await expect(
        checkoutService.createSession(invalidRequest)
      ).rejects.toThrow("Validation failed");
    });
  });
});
